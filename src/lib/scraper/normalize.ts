import type { ScrapedRecipe } from "@/types";
import { parseISODuration } from "@/lib/parser/duration";
import type { RawRecipeSchema } from "@/lib/scraper/jsonld";

function textOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj["@value"] === "string") return obj["@value"];
  }
  return "";
}

function extractImage(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImage(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj["@id"] === "string") return obj["@id"];
  }
  return null;
}

function extractServings(value: unknown): number {
  const text = textOf(value);
  if (!text) return 4;
  const match = text.match(/\d+(\.\d+)?/);
  if (match) {
    const n = Math.round(Number(match[0]));
    return n > 0 ? n : 4;
  }
  return 4;
}

function extractIngredients(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => textOf(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Flattens schema.org recipeInstructions (strings, HowToStep, or HowToSection) into plain steps. */
function extractInstructions(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    // Some sites cram all steps into one big string separated by newlines.
    return value
      .split(/\r?\n+/)
      .map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    const steps: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed) steps.push(trimmed);
        continue;
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const type = obj["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => typeof t === "string" && t.toLowerCase() === "howtosection")) {
          const sectionName = typeof obj.name === "string" ? obj.name : null;
          const nested = extractInstructions(obj.itemListElement);
          if (sectionName && nested.length) {
            steps.push(`${sectionName.toUpperCase()}`);
          }
          steps.push(...nested);
        } else {
          const text = typeof obj.text === "string" ? obj.text : typeof obj.name === "string" ? obj.name : "";
          if (text.trim()) steps.push(text.trim());
        }
      }
    }
    return steps;
  }

  return [];
}

function extractTags(schema: RawRecipeSchema): string[] {
  const tags = new Set<string>();
  const category = textOf(schema.recipeCategory);
  const cuisine = textOf(schema.recipeCuisine);
  const keywords = textOf(schema.keywords);
  [category, keywords]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8)
    .forEach((t) => tags.add(t));
  if (cuisine) tags.add(cuisine);
  return Array.from(tags);
}

export function normalizeRecipeSchema(schema: RawRecipeSchema, sourceUrl: string): ScrapedRecipe {
  const ingredientLines = extractIngredients(schema.recipeIngredient ?? schema.ingredients);
  const instructions = extractInstructions(schema.recipeInstructions);

  let sourceName: string | null = null;
  try {
    sourceName = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    sourceName = null;
  }

  return {
    title: textOf(schema.name ?? schema.headline) || "Untitled Recipe",
    description: textOf(schema.description),
    image: extractImage(schema.image),
    sourceUrl,
    sourceName,
    prepTimeMinutes: parseISODuration(schema.prepTime),
    cookTimeMinutes: parseISODuration(schema.cookTime),
    totalTimeMinutes: parseISODuration(schema.totalTime),
    servings: extractServings(schema.recipeYield ?? schema.yield),
    ingredientLines,
    instructions,
    tags: extractTags(schema),
    cuisine: textOf(schema.recipeCuisine) || null,
  };
}
