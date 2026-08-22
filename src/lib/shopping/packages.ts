import { toBaseAmount } from "@/lib/parser/units";
import type { ShoppingRegion } from "@/lib/shopping/region";

/**
 * Recipes call for "2 tbsp of soy sauce", but shops sell bottles. This module
 * maps an ingredient to the retail package sizes it's actually sold in, so the
 * shopper can pick a real product instead of an abstract amount.
 *
 * Sizes are hard-coded from common North American retail packaging, split by
 * region where the two markets genuinely differ (e.g. 4 L milk jugs in Canada
 * vs. gallons in the US).
 */

export type PackKind = "volume" | "mass" | "count";

/** A quantity + unit as printed on the package, e.g. [2, "l"] or [12, ""]. */
type PackSpec = [number, string];

export interface PackageOption {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  kind: PackKind;
  /** Size in base units (ml or g). Null for count-based packs like eggs. */
  baseAmount: number | null;
}

interface PackEntry {
  pattern: RegExp;
  kind: PackKind;
  /** Sizes used in Canada (metric packaging). */
  ca?: PackSpec[];
  /** Sizes used in the US. */
  us?: PackSpec[];
  /** Used for both when the packaging is effectively the same. */
  both?: PackSpec[];
}

const CATALOG: PackEntry[] = [
  // ---- Dairy & eggs ----
  {
    pattern: /\b(milk|buttermilk)\b/i,
    kind: "volume",
    ca: [[250, "ml"], [1, "l"], [2, "l"], [4, "l"]],
    us: [[1, "pint"], [1, "quart"], [0.5, "gallon"], [1, "gallon"]],
  },
  {
    pattern: /\b(cream|half and half|whipping cream)\b/i,
    kind: "volume",
    ca: [[250, "ml"], [500, "ml"], [1, "l"]],
    us: [[1, "cup"], [1, "pint"], [1, "quart"]],
  },
  {
    pattern: /\begg\b/i,
    kind: "count",
    both: [[6, ""], [12, ""], [18, ""], [30, ""]],
  },
  {
    pattern: /\bbutter\b/i,
    kind: "mass",
    ca: [[250, "g"], [454, "g"], [1, "kg"]],
    us: [[8, "oz"], [1, "lb"], [2, "lb"]],
  },
  {
    pattern: /\b(cheese|mozzarella|cheddar|parmesan|feta)\b/i,
    kind: "mass",
    ca: [[200, "g"], [320, "g"], [500, "g"], [700, "g"]],
    us: [[8, "oz"], [16, "oz"], [2, "lb"]],
  },
  {
    pattern: /\b(yogurt|yoghurt|sour cream)\b/i,
    kind: "mass",
    ca: [[175, "g"], [500, "g"], [750, "g"]],
    us: [[6, "oz"], [16, "oz"], [32, "oz"]],
  },

  // ---- Meat & seafood ----
  {
    // Deliberately no bare "ground" — that would swallow "ground cumin".
    pattern: /\b(chicken|beef|pork|turkey|lamb|steak|veal|mince)\b/i,
    kind: "mass",
    ca: [[500, "g"], [1, "kg"], [2, "kg"]],
    us: [[1, "lb"], [2, "lb"], [5, "lb"]],
  },
  {
    pattern: /\b(bacon|sausage|chorizo|pepperoni|ham)\b/i,
    kind: "mass",
    ca: [[375, "g"], [500, "g"], [1, "kg"]],
    us: [[12, "oz"], [1, "lb"], [2, "lb"]],
  },
  {
    pattern: /\b(shrimp|prawn|salmon|tuna|fish|cod|tilapia|scallop)\b/i,
    kind: "mass",
    ca: [[340, "g"], [454, "g"], [1, "kg"]],
    us: [[12, "oz"], [1, "lb"], [2, "lb"]],
  },

  // ---- Baking & pantry staples ----
  {
    pattern: /\bflour\b/i,
    kind: "mass",
    ca: [[1, "kg"], [2.5, "kg"], [5, "kg"], [10, "kg"]],
    us: [[2, "lb"], [5, "lb"], [10, "lb"]],
  },
  {
    pattern: /\bsugar\b/i,
    kind: "mass",
    ca: [[500, "g"], [1, "kg"], [2, "kg"], [4, "kg"]],
    us: [[1, "lb"], [2, "lb"], [4, "lb"], [10, "lb"]],
  },
  {
    pattern: /\b(rice|quinoa|couscous)\b/i,
    kind: "mass",
    ca: [[900, "g"], [2, "kg"], [5, "kg"], [8, "kg"]],
    us: [[2, "lb"], [5, "lb"], [10, "lb"], [20, "lb"]],
  },
  {
    pattern: /\b(pasta|noodle|spaghetti|macaroni|penne)\b/i,
    kind: "mass",
    ca: [[375, "g"], [450, "g"], [900, "g"]],
    us: [[12, "oz"], [1, "lb"], [2, "lb"]],
  },
  {
    pattern: /\b(oat|oatmeal|cereal|granola)\b/i,
    kind: "mass",
    ca: [[500, "g"], [1, "kg"], [2.25, "kg"]],
    us: [[18, "oz"], [42, "oz"], [5, "lb"]],
  },
  {
    pattern: /\b(cornstarch|cornmeal|baking powder|baking soda|yeast|cocoa)\b/i,
    kind: "mass",
    ca: [[100, "g"], [225, "g"], [500, "g"]],
    us: [[4, "oz"], [8, "oz"], [1, "lb"]],
  },
  {
    pattern: /\b(nut|almond|walnut|pecan|cashew|peanut|seed)\b/i,
    kind: "mass",
    ca: [[200, "g"], [400, "g"], [1, "kg"]],
    us: [[8, "oz"], [16, "oz"], [2, "lb"]],
  },
  {
    pattern: /\bchocolate\b/i,
    kind: "mass",
    ca: [[100, "g"], [200, "g"], [350, "g"]],
    us: [[4, "oz"], [8, "oz"], [12, "oz"]],
  },

  // ---- Oils, sauces, condiments ----
  {
    pattern: /\boil\b/i,
    kind: "volume",
    ca: [[500, "ml"], [1, "l"], [3, "l"]],
    us: [[16, "fl oz"], [32, "fl oz"], [1, "gallon"]],
  },
  {
    pattern: /\b(vinegar|soy sauce|hot sauce|worcestershire)\b/i,
    kind: "volume",
    ca: [[250, "ml"], [500, "ml"], [1, "l"]],
    us: [[8, "fl oz"], [16, "fl oz"], [32, "fl oz"]],
  },
  {
    pattern: /\b(ketchup|mustard|mayonnaise|mayo|bbq sauce|salsa)\b/i,
    kind: "volume",
    ca: [[375, "ml"], [750, "ml"], [1, "l"]],
    us: [[14, "fl oz"], [20, "fl oz"], [32, "fl oz"]],
  },
  {
    pattern: /\b(honey|syrup|jam|jelly|molasses)\b/i,
    kind: "volume",
    ca: [[375, "ml"], [500, "ml"], [1, "l"]],
    us: [[12, "fl oz"], [16, "fl oz"], [32, "fl oz"]],
  },
  {
    pattern: /\b(peanut butter|tahini|nutella)\b/i,
    kind: "mass",
    ca: [[500, "g"], [750, "g"], [1, "kg"]],
    us: [[16, "oz"], [28, "oz"], [40, "oz"]],
  },

  // ---- Spices ----
  {
    // "pepper" and "clove" are intentionally qualified so bell peppers and
    // garlic cloves stay in the produce aisle.
    pattern:
      /\b(salt|black pepper|white pepper|peppercorn|cayenne|ground clove|cumin|paprika|cinnamon|nutmeg|cardamom|turmeric|oregano|chili powder|curry powder|thyme|rosemary|sage|bay leaf|seasoning|spice)\b/i,
    kind: "mass",
    ca: [[30, "g"], [50, "g"], [100, "g"], [500, "g"]],
    us: [[1, "oz"], [2, "oz"], [4, "oz"], [1, "lb"]],
  },
  {
    pattern: /\b(vanilla|extract)\b/i,
    kind: "volume",
    ca: [[37, "ml"], [100, "ml"], [250, "ml"]],
    us: [[1, "fl oz"], [2, "fl oz"], [8, "fl oz"]],
  },

  // ---- Canned & liquids ----
  {
    pattern: /\b(broth|stock|bouillon)\b/i,
    kind: "volume",
    ca: [[900, "ml"], [1, "l"], [2, "l"]],
    us: [[14, "fl oz"], [32, "fl oz"], [48, "fl oz"]],
  },
  {
    pattern: /\b(tomato|bean|chickpea|lentil|corn|coconut milk)\b/i,
    kind: "volume",
    ca: [[398, "ml"], [540, "ml"], [796, "ml"]],
    us: [[14.5, "fl oz"], [15, "fl oz"], [28, "fl oz"]],
  },
  {
    pattern: /\b(juice|soda|cider|water)\b/i,
    kind: "volume",
    ca: [[1, "l"], [1.89, "l"], [2, "l"]],
    us: [[32, "fl oz"], [64, "fl oz"], [1, "gallon"]],
  },
  {
    pattern: /\bwine\b/i,
    kind: "volume",
    both: [[375, "ml"], [750, "ml"], [1.5, "l"]],
  },

  // ---- Produce sold by count or bag ----
  {
    pattern: /\b(onion|potato|apple|orange|lemon|lime|carrot|banana|avocado|pepper|tomato)\b/i,
    kind: "count",
    both: [[1, ""], [3, ""], [6, ""]],
  },
  {
    pattern: /\bgarlic\b/i,
    kind: "count",
    both: [[1, ""], [3, ""]],
  },
  {
    pattern: /\b(bread|bun|bagel|tortilla|pita|baguette)\b/i,
    kind: "count",
    both: [[1, ""], [2, ""]],
  },
  {
    pattern: /\b(coffee)\b/i,
    kind: "mass",
    ca: [[340, "g"], [900, "g"]],
    us: [[12, "oz"], [2, "lb"]],
  },
];

/** Fallback sizes when the ingredient isn't in the catalog. */
const FALLBACK: Record<PackKind, { ca: PackSpec[]; us: PackSpec[] }> = {
  volume: {
    ca: [[250, "ml"], [500, "ml"], [1, "l"], [2, "l"]],
    us: [[8, "fl oz"], [16, "fl oz"], [32, "fl oz"], [1, "gallon"]],
  },
  mass: {
    ca: [[250, "g"], [500, "g"], [1, "kg"], [2, "kg"]],
    us: [[8, "oz"], [1, "lb"], [2, "lb"], [5, "lb"]],
  },
  count: {
    ca: [[1, ""], [2, ""], [6, ""], [12, ""]],
    us: [[1, ""], [2, ""], [6, ""], [12, ""]],
  },
};

function labelFor(quantity: number, unit: string, kind: PackKind): string {
  const rounded = Number.isInteger(quantity) ? String(quantity) : String(quantity);
  if (kind === "count" || !unit) {
    return quantity === 1 ? "1 each" : `${rounded} pack`;
  }
  return `${rounded} ${unit}`;
}

function toOption(spec: PackSpec, kind: PackKind, index: number): PackageOption {
  const [quantity, unit] = spec;
  return {
    id: `${kind}-${quantity}-${unit || "each"}-${index}`,
    label: labelFor(quantity, unit, kind),
    quantity,
    unit,
    kind,
    baseAmount: kind === "count" ? null : toBaseAmount(quantity, unit),
  };
}

/**
 * Returns the retail package sizes an ingredient is typically sold in.
 * `unitHint` (the unit the recipe used) disambiguates the generic fallback —
 * a recipe asking for "ml" gets bottles, one asking for "g" gets bags.
 */
export function getPackageOptions(
  name: string,
  unitHint: string | null | undefined,
  region: ShoppingRegion = "us",
): PackageOption[] {
  const entry = CATALOG.find((c) => c.pattern.test(name));

  if (entry) {
    const specs = (region === "ca" ? entry.ca : entry.us) ?? entry.both ?? entry.ca ?? entry.us ?? [];
    return specs.map((spec, i) => toOption(spec, entry.kind, i));
  }

  // Not in the catalog — infer volume/mass/count from the recipe's own unit.
  const base = unitHint ? toBaseAmount(1, unitHint) : null;
  let kind: PackKind = "count";
  if (base !== null) {
    kind = ["ml", "l", "tsp", "tbsp", "cup", "pint", "quart", "gallon", "fl oz"].includes(
      unitHint!.toLowerCase(),
    )
      ? "volume"
      : "mass";
  }

  const specs = FALLBACK[kind][region === "ca" ? "ca" : "us"];
  return specs.map((spec, i) => toOption(spec, kind, i));
}

/**
 * How many of a given package you need to cover the required amount.
 * Returns at least 1, so a recipe needing 2 tbsp still tells you to buy a bottle.
 */
export function packsNeeded(
  requiredBase: number | null,
  requiredCount: number | null,
  option: PackageOption,
): number {
  if (option.kind === "count") {
    const need = requiredCount ?? 1;
    return Math.max(1, Math.ceil(need / option.quantity));
  }
  if (requiredBase === null || option.baseAmount === null || option.baseAmount <= 0) return 1;
  return Math.max(1, Math.ceil(requiredBase / option.baseAmount));
}

/** Marks the smallest package that covers the requirement in one purchase. */
export function bestPackIndex(
  requiredBase: number | null,
  requiredCount: number | null,
  options: PackageOption[],
): number {
  const index = options.findIndex((o) => packsNeeded(requiredBase, requiredCount, o) === 1);
  return index === -1 ? options.length - 1 : index;
}

/** Price per 100 g / 100 ml, so different pack sizes can be compared fairly. */
export function unitPriceLabel(
  price: number | null,
  option: PackageOption | null,
  currency: string,
): string | null {
  if (price === null || !option || option.baseAmount === null || option.baseAmount <= 0) return null;
  const per100 = (price / option.baseAmount) * 100;
  if (!Number.isFinite(per100) || per100 <= 0) return null;
  const suffix = option.kind === "volume" ? "100 ml" : "100 g";
  return `${currency}${per100.toFixed(2)}/${suffix}`;
}
