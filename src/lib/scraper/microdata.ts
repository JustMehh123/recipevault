import * as cheerio from "cheerio";
import type { ScrapedRecipe } from "@/types";
import { parseISODuration } from "@/lib/parser/duration";

/**
 * Fallback extractor for pages that expose schema.org Recipe data via
 * microdata (itemprop attributes) instead of JSON-LD. This covers a smaller
 * slice of real-world sites but keeps the importer working when JSON-LD is
 * missing or malformed.
 */
export function extractMicrodataRecipe(html: string, sourceUrl: string): ScrapedRecipe | null {
  const $ = cheerio.load(html);
  const scope = $('[itemtype*="schema.org/Recipe" i]').first();
  if (scope.length === 0) return null;

  const prop = (name: string) => scope.find(`[itemprop="${name}"]`);

  const textFrom = (el: ReturnType<typeof prop>): string => {
    if (el.length === 0) return "";
    const first = el.first();
    return (first.attr("content") || first.text() || "").trim();
  };

  const listFrom = (name: string): string[] => {
    const els = prop(name);
    if (els.length === 0) return [];
    return els
      .toArray()
      .map((el) => ($(el).attr("content") || $(el).text() || "").trim())
      .filter(Boolean);
  };

  const title = textFrom(prop("name")) || $("h1").first().text().trim();
  if (!title) return null;

  const image = scope.find('[itemprop="image"]').first();
  const imageUrl =
    image.attr("content") ||
    image.attr("src") ||
    image.attr("data-src") ||
    null;

  let sourceName: string | null = null;
  try {
    sourceName = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    sourceName = null;
  }

  const yieldText = textFrom(prop("recipeYield"));
  const servingsMatch = yieldText.match(/\d+/);

  const instructions = listFrom("recipeInstructions");

  return {
    title,
    description: textFrom(prop("description")),
    image: imageUrl,
    sourceUrl,
    sourceName,
    prepTimeMinutes: parseISODuration(prop("prepTime").attr("datetime") || textFrom(prop("prepTime"))),
    cookTimeMinutes: parseISODuration(prop("cookTime").attr("datetime") || textFrom(prop("cookTime"))),
    totalTimeMinutes: parseISODuration(prop("totalTime").attr("datetime") || textFrom(prop("totalTime"))),
    servings: servingsMatch ? Number(servingsMatch[0]) : 4,
    ingredientLines: listFrom("recipeIngredient").length
      ? listFrom("recipeIngredient")
      : listFrom("ingredients"),
    instructions: instructions.length
      ? instructions
      : instructions,
    tags: [],
    cuisine: textFrom(prop("recipeCuisine")) || null,
  };
}
