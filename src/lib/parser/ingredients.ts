import type { Ingredient } from "@/types";
import { generateId } from "@/lib/utils";

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
  "⅑": 1 / 9,
  "⅒": 1 / 10,
};

/** Known units, ordered longest-first so greedy matching prefers full words. */
const UNIT_ALIASES: Record<string, string> = {
  cups: "cup",
  cup: "cup",
  c: "cup",
  tablespoons: "tbsp",
  tablespoon: "tbsp",
  tbsp: "tbsp",
  tbsps: "tbsp",
  "tbs.": "tbsp",
  teaspoons: "tsp",
  teaspoon: "tsp",
  tsp: "tsp",
  tsps: "tsp",
  ounces: "oz",
  ounce: "oz",
  oz: "oz",
  pounds: "lb",
  pound: "lb",
  lbs: "lb",
  lb: "lb",
  grams: "g",
  gram: "g",
  g: "g",
  kilograms: "kg",
  kilogram: "kg",
  kg: "kg",
  milliliters: "ml",
  milliliter: "ml",
  millilitres: "ml",
  ml: "ml",
  liters: "l",
  liter: "l",
  litres: "l",
  litre: "l",
  l: "l",
  pints: "pint",
  pint: "pint",
  quarts: "quart",
  quart: "quart",
  gallons: "gallon",
  gallon: "gallon",
  cloves: "clove",
  clove: "clove",
  cans: "can",
  can: "can",
  packages: "package",
  package: "package",
  pkg: "package",
  pinches: "pinch",
  pinch: "pinch",
  dashes: "dash",
  dash: "dash",
  sticks: "stick",
  stick: "stick",
  bunches: "bunch",
  bunch: "bunch",
  heads: "head",
  head: "head",
  slices: "slice",
  slice: "slice",
  stalks: "stalk",
  stalk: "stalk",
  sprigs: "sprig",
  sprig: "sprig",
};

const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(".", "\\."))
  .join("|");

const UNIT_REGEX = new RegExp(`^(${UNIT_PATTERN})\\.?$`, "i");

function normalizeFractionChars(text: string): string {
  let result = text;
  for (const [char, value] of Object.entries(UNICODE_FRACTIONS)) {
    result = result.split(char).join(` ${value} `);
  }
  return result.trim();
}

/** Parses a leading numeric token (int, decimal, fraction, or mixed number) into a float. */
function parseNumericToken(token: string): number | null {
  const cleaned = token.trim();
  if (!cleaned) return null;

  // Mixed number like "1 1/2" already split by space -> handled by caller joining.
  const fractionMatch = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    return denominator === 0 ? null : numerator / denominator;
  }

  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned);
  }

  return null;
}

/**
 * Extracts a leading quantity (supporting decimals, vulgar fractions, unicode
 * fraction glyphs, mixed numbers, and ranges like "1-2" or "1 to 2") from the
 * start of an ingredient string. Returns the parsed quantity and the
 * remaining unconsumed text.
 */
function extractLeadingQuantity(input: string): { quantity: number | null; rest: string } {
  const normalized = normalizeFractionChars(input).trim();

  // Range: "1-2 cups" or "1 to 2 cups" -> use the first number, keep going.
  const rangeMatch = normalized.match(
    /^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(.*)$/i,
  );
  if (rangeMatch) {
    const first = parseCompoundNumber(rangeMatch[1]);
    if (first !== null) {
      return { quantity: first, rest: rangeMatch[3] };
    }
  }

  // Mixed number: "1 1/2 cups"
  const mixedMatch = normalized.match(/^(\d+)\s+(\d+)\/(\d+)\s+(.*)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);
    const quantity = denominator === 0 ? whole : whole + numerator / denominator;
    return { quantity, rest: mixedMatch[4] };
  }

  // Simple fraction: "1/2 cup"
  const fracMatch = normalized.match(/^(\d+)\/(\d+)\s+(.*)$/);
  if (fracMatch) {
    const numerator = Number(fracMatch[1]);
    const denominator = Number(fracMatch[2]);
    const quantity = denominator === 0 ? null : numerator / denominator;
    return { quantity, rest: fracMatch[3] };
  }

  // Plain decimal/integer: "2 cups" or "2.5 cups"
  const numMatch = normalized.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
  if (numMatch) {
    return { quantity: Number(numMatch[1]), rest: numMatch[2] };
  }

  // A lone number with nothing after it (rare) e.g. "2 eggs" already covered above.
  return { quantity: null, rest: normalized };
}

function parseCompoundNumber(token: string): number | null {
  const mixedMatch = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const numerator = Number(mixedMatch[2]);
    const denominator = Number(mixedMatch[3]);
    return denominator === 0 ? whole : whole + numerator / denominator;
  }
  return parseNumericToken(token);
}

/**
 * Parses a free-text ingredient line such as "2 1/2 cups all-purpose flour,
 * sifted" into a structured Ingredient. This is intentionally forgiving: any
 * text that can't be confidently split still ends up in `name` so nothing is
 * ever lost.
 */
export function parseIngredientLine(raw: string): Ingredient {
  const cleaned = raw
    .replace(/^[-•*\u2022\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  const { quantity, rest } = extractLeadingQuantity(cleaned);

  let unit: string | null = null;
  let remainder = rest.trim();

  const restTokens = remainder.split(" ");
  if (restTokens.length > 0) {
    const firstToken = restTokens[0].replace(/[(),]/g, "");
    if (UNIT_REGEX.test(firstToken)) {
      unit = UNIT_ALIASES[firstToken.toLowerCase().replace(/\.$/, "")] ?? firstToken.toLowerCase();
      remainder = restTokens.slice(1).join(" ").trim();
    }
  }

  // Split off trailing notes after a comma: "chicken breast, diced"
  let name = remainder;
  let notes: string | null = null;
  const commaIndex = remainder.indexOf(",");
  if (commaIndex !== -1) {
    name = remainder.slice(0, commaIndex).trim();
    notes = remainder.slice(commaIndex + 1).trim() || null;
  }

  // Strip parenthetical asides into notes, e.g. "butter (softened)"
  const parenMatch = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    name = parenMatch[1].trim();
    notes = notes ? `${notes}; ${parenMatch[2].trim()}` : parenMatch[2].trim();
  }

  if (!name) {
    name = cleaned;
  }

  return {
    id: generateId(),
    raw: cleaned,
    quantity: quantity ?? null,
    unit,
    name: name.trim(),
    notes,
  };
}

export function parseIngredientLines(lines: string[]): Ingredient[] {
  return lines.map(parseIngredientLine).filter((i) => i.raw.length > 0);
}

/** Formats a decimal quantity back into friendly text, preferring simple fractions. */
export function formatQuantity(quantity: number | null): string {
  if (quantity === null) return "";
  if (Number.isInteger(quantity)) return String(quantity);

  const whole = Math.floor(quantity);
  const fraction = quantity - whole;

  const commonFractions: Array<[number, string]> = [
    [1 / 8, "1/8"],
    [1 / 4, "1/4"],
    [1 / 3, "1/3"],
    [3 / 8, "3/8"],
    [1 / 2, "1/2"],
    [5 / 8, "5/8"],
    [2 / 3, "2/3"],
    [3 / 4, "3/4"],
    [7 / 8, "7/8"],
  ];

  for (const [value, label] of commonFractions) {
    if (Math.abs(fraction - value) < 0.02) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  return Number(quantity.toFixed(2)).toString();
}

/** Scales a single ingredient's quantity by a given factor, returning a new object. */
export function scaleIngredient(ingredient: Ingredient, factor: number): Ingredient {
  if (ingredient.quantity === null || factor === 1) return ingredient;
  return {
    ...ingredient,
    quantity: ingredient.quantity * factor,
  };
}

export function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
  return ingredients.map((ing) => scaleIngredient(ing, factor));
}

/** Renders an ingredient (optionally scaled) back into a human-friendly display line. */
export function displayIngredient(ingredient: Ingredient): string {
  const parts: string[] = [];
  if (ingredient.quantity !== null) parts.push(formatQuantity(ingredient.quantity));
  if (ingredient.unit) parts.push(ingredient.unit);
  parts.push(ingredient.name);
  let line = parts.join(" ").trim();
  if (ingredient.notes) line += `, ${ingredient.notes}`;
  return line;
}
