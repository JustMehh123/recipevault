import * as cheerio from "cheerio";

/** Loosely-typed shape of a schema.org Recipe JSON-LD node — real-world pages vary wildly. */
export interface RawRecipeSchema {
  "@type"?: string | string[];
  name?: string;
  headline?: string;
  description?: string;
  image?: unknown;
  author?: unknown;
  recipeYield?: unknown;
  yield?: unknown;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeIngredient?: unknown;
  ingredients?: unknown;
  recipeInstructions?: unknown;
  recipeCategory?: unknown;
  recipeCuisine?: unknown;
  keywords?: unknown;
  [key: string]: unknown;
}

function isRecipeType(node: unknown): node is RawRecipeSchema {
  if (!node || typeof node !== "object") return false;
  const type = (node as RawRecipeSchema)["@type"];
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
}

/** Recursively searches a parsed JSON-LD value for the first Recipe node. */
function findRecipeNode(value: unknown): RawRecipeSchema | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    if (isRecipeType(value)) return value as RawRecipeSchema;
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) {
      const found = findRecipeNode(obj["@graph"]);
      if (found) return found;
    }
    // Some sites nest the recipe under a `mainEntity` or `about` property.
    if (obj.mainEntity) {
      const found = findRecipeNode(obj.mainEntity);
      if (found) return found;
    }
  }

  return null;
}

/** Extracts the first schema.org Recipe node found in any JSON-LD <script> tag on the page. */
export function extractJsonLdRecipe(html: string): RawRecipeSchema | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (const el of scripts.toArray()) {
    const raw = $(el).contents().text();
    if (!raw || !raw.trim()) continue;
    try {
      const parsed = JSON.parse(raw);
      const recipe = findRecipeNode(parsed);
      if (recipe) return recipe;
    } catch {
      // Some pages ship multiple concatenated JSON objects or trailing commas —
      // try a best-effort cleanup before giving up on this script block.
      try {
        const cleaned = raw.replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(cleaned);
        const recipe = findRecipeNode(parsed);
        if (recipe) return recipe;
      } catch {
        continue;
      }
    }
  }

  return null;
}
