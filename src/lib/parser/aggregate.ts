import type { GroceryItem, Ingredient } from "@/types";
import { categorizeIngredient } from "@/lib/parser/category";
import { generateId } from "@/lib/utils";

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
 * the same ingredient are kept as separate lines since we don't attempt
 * unit conversion (e.g. "2 cups milk" and "500 ml milk" stay distinct).
 */
export function aggregateIngredients(inputs: AggregateInput[]): GroceryItem[] {
  interface WorkingItem extends GroceryItem {
    notesSet: Set<string>;
  }

  const groups = new Map<string, WorkingItem>();

  for (const { ingredient, recipeId } of inputs) {
    const trimmedName = ingredient.name.trim();
    if (!trimmedName) continue;
    const normalizedName = singularize(trimmedName.toLowerCase());
    const unitKey = ingredient.unit ?? "";
    const key = `${normalizedName}|${unitKey}`;

    const existing = groups.get(key);
    if (existing) {
      if (ingredient.quantity !== null) {
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
      });
    }
  }

  return Array.from(groups.values())
    .map(({ notesSet, ...item }) => ({
      ...item,
      notes: notesSet.size ? Array.from(notesSet).join("; ") : null,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
