import type { Ingredient } from "@/types";

export type UnitSystem = "original" | "metric" | "imperial";

export const UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = {
  original: "Original",
  metric: "Metric",
  imperial: "US",
};

/** Base units we normalize to internally: millilitres for volume, grams for mass. */
type Dimension = "volume" | "mass";

interface UnitDef {
  dimension: Dimension;
  /** How many base units (ml or g) one of this unit represents. */
  base: number;
  system: "metric" | "imperial";
}

const UNIT_DEFS: Record<string, UnitDef> = {
  // Volume — imperial / US customary
  tsp: { dimension: "volume", base: 4.92892, system: "imperial" },
  tbsp: { dimension: "volume", base: 14.7868, system: "imperial" },
  "fl oz": { dimension: "volume", base: 29.5735, system: "imperial" },
  cup: { dimension: "volume", base: 236.588, system: "imperial" },
  pint: { dimension: "volume", base: 473.176, system: "imperial" },
  quart: { dimension: "volume", base: 946.353, system: "imperial" },
  gallon: { dimension: "volume", base: 3785.41, system: "imperial" },
  // Volume — metric
  ml: { dimension: "volume", base: 1, system: "metric" },
  l: { dimension: "volume", base: 1000, system: "metric" },
  // Mass — imperial
  oz: { dimension: "mass", base: 28.3495, system: "imperial" },
  lb: { dimension: "mass", base: 453.592, system: "imperial" },
  // Mass — metric
  g: { dimension: "mass", base: 1, system: "metric" },
  kg: { dimension: "mass", base: 1000, system: "metric" },
};

/** Ladders used when picking the nicest unit to display a converted amount in. */
const METRIC_VOLUME: Array<[string, number]> = [
  ["ml", 1],
  ["l", 1000],
];
const METRIC_MASS: Array<[string, number]> = [
  ["g", 1],
  ["kg", 1000],
];
const IMPERIAL_VOLUME: Array<[string, number]> = [
  ["tsp", 4.92892],
  ["tbsp", 14.7868],
  ["cup", 236.588],
  ["quart", 946.353],
  ["gallon", 3785.41],
];
const IMPERIAL_MASS: Array<[string, number]> = [
  ["oz", 28.3495],
  ["lb", 453.592],
];

function roundNice(value: number): number {
  if (value >= 100) return Math.round(value / 5) * 5;
  if (value >= 20) return Math.round(value);
  if (value >= 10) return Math.round(value * 2) / 2;
  if (value >= 1) return Math.round(value * 4) / 4;
  return Math.round(value * 8) / 8;
}

function pickUnit(
  baseAmount: number,
  ladder: Array<[string, number]>,
): { quantity: number; unit: string } {
  let chosen = ladder[0];
  for (const step of ladder) {
    if (baseAmount >= step[1]) chosen = step;
  }
  return { quantity: roundNice(baseAmount / chosen[1]), unit: chosen[0] };
}

/**
 * Converts a single ingredient into the requested measurement system.
 * Ingredients without a convertible unit (e.g. "2 eggs", "1 clove garlic")
 * are returned untouched, which is the correct behaviour for counts.
 */
export function convertIngredient(ingredient: Ingredient, system: UnitSystem): Ingredient {
  if (system === "original") return ingredient;
  if (ingredient.quantity === null || !ingredient.unit) return ingredient;

  const def = UNIT_DEFS[ingredient.unit.toLowerCase()];
  if (!def) return ingredient;
  if (def.system === system) return ingredient;

  const baseAmount = ingredient.quantity * def.base;

  const ladder =
    system === "metric"
      ? def.dimension === "volume"
        ? METRIC_VOLUME
        : METRIC_MASS
      : def.dimension === "volume"
        ? IMPERIAL_VOLUME
        : IMPERIAL_MASS;

  const { quantity, unit } = pickUnit(baseAmount, ladder);
  if (!Number.isFinite(quantity) || quantity <= 0) return ingredient;

  return { ...ingredient, quantity, unit };
}

/** Returns the dimension ("volume"/"mass") of a unit, or null if unknown. */
export function unitDimension(unit: string | null | undefined): Dimension | null {
  if (!unit) return null;
  return UNIT_DEFS[unit.toLowerCase()]?.dimension ?? null;
}

/** Converts an amount into base units (ml or g). Null when the unit is unknown. */
export function toBaseAmount(quantity: number, unit: string | null | undefined): number | null {
  if (!unit) return null;
  const def = UNIT_DEFS[unit.toLowerCase()];
  if (!def) return null;
  return quantity * def.base;
}

/**
 * Renders a base amount (ml or g) back into the nicest unit of the given
 * system — used when merging grocery quantities that arrived in mixed units.
 */
export function fromBaseAmount(
  baseAmount: number,
  dimension: Dimension,
  system: "metric" | "imperial",
): { quantity: number; unit: string } {
  const ladder =
    system === "metric"
      ? dimension === "volume"
        ? METRIC_VOLUME
        : METRIC_MASS
      : dimension === "volume"
        ? IMPERIAL_VOLUME
        : IMPERIAL_MASS;
  return pickUnit(baseAmount, ladder);
}

/** Which measurement system a unit belongs to, if we recognize it. */
export function unitSystemOf(unit: string | null | undefined): "metric" | "imperial" | null {
  if (!unit) return null;
  return UNIT_DEFS[unit.toLowerCase()]?.system ?? null;
}

export function convertIngredients(ingredients: Ingredient[], system: UnitSystem): Ingredient[] {
  if (system === "original") return ingredients;
  return ingredients.map((ing) => convertIngredient(ing, system));
}

/** True when at least one ingredient would actually change under conversion. */
export function hasConvertibleUnits(ingredients: Ingredient[]): boolean {
  return ingredients.some((i) => i.unit != null && UNIT_DEFS[i.unit.toLowerCase()] !== undefined);
}
