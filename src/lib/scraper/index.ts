import type { ScrapedRecipe } from "@/types";
import { extractJsonLdRecipe } from "@/lib/scraper/jsonld";
import { normalizeRecipeSchema } from "@/lib/scraper/normalize";
import { extractMicrodataRecipe } from "@/lib/scraper/microdata";

export class RecipeScrapeError extends Error {}

const FETCH_TIMEOUT_MS = 15000;

/**
 * Fetches a web page and extracts a clean, ad-free recipe from its
 * schema.org/Recipe metadata (JSON-LD first, then microdata fallback).
 * Runs server-side only (uses `fetch` + `cheerio`, avoids browser CORS).
 */
export async function fetchAndParseRecipe(url: string): Promise<ScrapedRecipe> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new RecipeScrapeError("That doesn't look like a valid URL.");
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new RecipeScrapeError("Only http/https URLs are supported.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 RecipeVaultBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new RecipeScrapeError(
        `The site responded with an error (HTTP ${response.status}). It may be blocking automated requests.`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("xml") && contentType !== "") {
      throw new RecipeScrapeError("That URL doesn't appear to point to a web page.");
    }

    html = await response.text();
  } catch (error) {
    if (error instanceof RecipeScrapeError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new RecipeScrapeError("The site took too long to respond.");
    }
    throw new RecipeScrapeError(
      "Couldn't reach that page. Double-check the URL, or the site may be blocking imports.",
    );
  } finally {
    clearTimeout(timeout);
  }

  const jsonLd = extractJsonLdRecipe(html);
  if (jsonLd) {
    const normalized = normalizeRecipeSchema(jsonLd, parsedUrl.toString());
    if (normalized.ingredientLines.length > 0 || normalized.instructions.length > 0) {
      return normalized;
    }
  }

  const microdata = extractMicrodataRecipe(html, parsedUrl.toString());
  if (microdata && (microdata.ingredientLines.length > 0 || microdata.instructions.length > 0)) {
    return microdata;
  }

  throw new RecipeScrapeError(
    "No recipe data was found on that page. Try a different URL, or paste the recipe text manually.",
  );
}
