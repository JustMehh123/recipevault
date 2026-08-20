import { getDb } from "@/lib/db/client";
import type { GroceryItem, GroceryList, Recipe } from "@/types";
import { generateId } from "@/lib/utils";
import { aggregateIngredients, type AggregateInput } from "@/lib/parser/aggregate";
import { scaleIngredients } from "@/lib/parser/ingredients";
import { getWeekEntries } from "@/lib/db/mealPlan";
import { formatWeekRange } from "@/lib/utils";

export async function listGroceryLists(): Promise<GroceryList[]> {
  const db = getDb();
  return db.groceryLists.orderBy("createdAt").reverse().toArray();
}

export async function getGroceryList(id: string): Promise<GroceryList | undefined> {
  const db = getDb();
  return db.groceryLists.get(id);
}

export async function saveGroceryList(list: GroceryList): Promise<string> {
  const db = getDb();
  await db.groceryLists.put(list);
  return list.id;
}

export async function deleteGroceryList(id: string): Promise<void> {
  const db = getDb();
  await db.groceryLists.delete(id);
}

export async function toggleGroceryItem(listId: string, itemId: string): Promise<void> {
  const db = getDb();
  const list = await db.groceryLists.get(listId);
  if (!list) return;
  const items = list.items.map((item) =>
    item.id === itemId ? { ...item, checked: !item.checked } : item,
  );
  await db.groceryLists.update(listId, { items, updatedAt: Date.now() });
}

export async function addManualGroceryItem(
  listId: string,
  item: Pick<GroceryItem, "name" | "quantity" | "unit" | "category">,
): Promise<void> {
  const db = getDb();
  const list = await db.groceryLists.get(listId);
  if (!list) return;
  const newItem: GroceryItem = {
    id: generateId(),
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    checked: false,
    notes: null,
    sourceRecipeIds: [],
    manual: true,
  };
  await db.groceryLists.update(listId, {
    items: [...list.items, newItem],
    updatedAt: Date.now(),
  });
}

export async function removeGroceryItem(listId: string, itemId: string): Promise<void> {
  const db = getDb();
  const list = await db.groceryLists.get(listId);
  if (!list) return;
  await db.groceryLists.update(listId, {
    items: list.items.filter((item) => item.id !== itemId),
    updatedAt: Date.now(),
  });
}

export async function clearCheckedItems(listId: string): Promise<void> {
  const db = getDb();
  const list = await db.groceryLists.get(listId);
  if (!list) return;
  await db.groceryLists.update(listId, {
    items: list.items.filter((item) => !item.checked),
    updatedAt: Date.now(),
  });
}

/**
 * Builds a brand new grocery list by collecting every recipe scheduled in
 * the given week's meal plan, scaling ingredients to the planned servings,
 * and merging duplicates into aisle-categorized line items.
 */
export async function generateGroceryListFromWeek(weekStart: string): Promise<GroceryList> {
  const db = getDb();
  const entries = await getWeekEntries(weekStart);

  const recipeIds = Array.from(new Set(entries.map((e) => e.recipeId)));
  const recipes = await db.recipes.bulkGet(recipeIds);
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => {
    if (r) recipeMap.set(r.id, r);
  });

  const inputs: AggregateInput[] = [];
  for (const entry of entries) {
    const recipe = recipeMap.get(entry.recipeId);
    if (!recipe) continue;
    const factor = recipe.servings > 0 ? entry.servings / recipe.servings : 1;
    const scaled = scaleIngredients(recipe.ingredients, factor);
    scaled.forEach((ingredient) => inputs.push({ ingredient, recipeId: recipe.id }));
  }

  const items = aggregateIngredients(inputs);

  const list: GroceryList = {
    id: generateId(),
    name: `Groceries for ${formatWeekRange(weekStart)}`,
    weekStart,
    items,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.groceryLists.put(list);
  return list;
}
