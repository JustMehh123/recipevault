import type { GroceryItem, Ingredient } from "@/types";
import { categorizeIngredient } from "@/lib/parser/category";
import { generateId } from "@/lib/utils";
import { fromBaseAmount, toBaseAmount, unitDimension, unitSystemOf } from "@/lib/parser/units";

/** Ingredient names that should never be singularized because they're mass/plural nouns. */
const SINGULARIZE_EXCEPTIONS = new Set([
  "asparagus",
  "hummus",
  "couscous",
  "molasses",
  "greens",
  "grits",
  "oats",
  "peas",
  "chives",
  "noodles",
  "beans",
  "lentils",
  "spices",
  "breadcrumbs",
  "leftovers",
  "greens",
]);

/** Very small, conservative English singularizer for common grocery nouns. */
export function singularize(word: string): string {
  const lower = word.toLowerCase().trim();
  if (!lower || SINGULARIZE_EXCEPTIONS.has(lower)) return lower;
  if (lower.endsWith("ies") && lower.length > 3) return `${lower.slice(0, -3)}y`;
  if (lower.endsWith("oes") && lower.length > 3) return lower.slice(0, -2);
  if (lower.endsWith("ves") && lower.length > 3) return `${lower.slice(0, -3)}f`;
  if (lower.endsWith("ss")) return lower;
  if (lower.endsWith("s") && !lower.endsWith("us") && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function titleCase(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface AggregateInput {
  ingredient: Ingredient;
  recipeId: string;
}

/**
 * Merges ingredients pulled from multiple recipes into a de-duplicated,
 * aisle-categorized grocery list. Ingredients are grouped by normalized
 * (singular) name + unit; quantities are summed when both sides have a
 * parsed numeric quantity in the same unit. Items with different units for
 * the same ingredient are reconciled through a shared base unit, so
 * "2 cups milk" + "500 ml milk" merge into a single line. Non-convertible
 * units ("2 cloves" vs "1 head") stay separate, which is correct.
 */
export function aggregateIngredients(inputs: AggregateInput[]): GroceryItem[] {
  interface WorkingItem extends GroceryItem {
    notesSet: Set<string>;
    /** Running total in base units (ml/g) when this group is unit-convertible. */
    baseAmount: number | null;
    dimension: "volume" | "mass" | null;
    /** System of the first unit seen, so output matches how the user writes. */
    preferredSystem: "metric" | "imperial" | null;
  }

  const groups = new Map<string, WorkingItem>();

  for (const { ingredient, recipeId } of inputs) {
    const trimmedName = ingredient.name.trim();
    if (!trimmedName) continue;

    const normalizedName = singularize(trimmedName.toLowerCase());
    const dimension = unitDimension(ingredient.unit);

    // Convertible units group by dimension so cups + ml land in one line.
    // Everything else groups by the literal unit ("clove", "can", or none).
    const key = dimension
      ? `${normalizedName}|dim:${dimension}`
      : `${normalizedName}|${ingredient.unit ?? ""}`;

    const base =
      ingredient.quantity !== null ? toBaseAmount(ingredient.quantity, ingredient.unit) : null;

    const existing = groups.get(key);
    if (existing) {
      if (existing.dimension && base !== null) {
        existing.baseAmount = (existing.baseAmount ?? 0) + base;
      } else if (ingredient.quantity !== null) {
        existing.quantity = (existing.quantity ?? 0) + ingredient.quantity;
      }
      if (!existing.sourceRecipeIds.includes(recipeId)) {
        existing.sourceRecipeIds.push(recipeId);
      }
      if (ingredient.notes) existing.notesSet.add(ingredient.notes);
    } else {
      const notesSet = new Set<string>();
      if (ingredient.notes) notesSet.add(ingredient.notes);
      groups.set(key, {
        id: generateId(),
        name: titleCase(normalizedName),
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: categorizeIngredient(normalizedName),
        checked: false,
        notes: null,
        sourceRecipeIds: [recipeId],
        manual: false,
        notesSet,
        baseAmount: base,
        dimension,
        preferredSystem: unitSystemOf(ingredient.unit),
      });
    }
  }

  return Array.from(groups.values())
    .map(({ notesSet, baseAmount, dimension, preferredSystem, ...item }) => {
      // Convert the merged base total back into a friendly unit.
      if (dimension && baseAmount !== null && baseAmount > 0) {
        const rendered = fromBaseAmount(baseAmount, dimension, preferredSystem ?? "metric");
        item.quantity = rendered.quantity;
        item.unit = rendered.unit;
      }
      return {
        ...item,
        notes: notesSet.size ? Array.from(notesSet).join("; ") : null,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
