import Dexie, { type Table } from "dexie";
import type { GroceryList, MealPlanEntry, Recipe } from "@/types";

/**
 * RecipeVault's local-first database. Everything lives in the browser via
 * IndexedDB (through Dexie) — recipes, meal plans, and grocery lists never
 * leave the device.
 */
export class RecipeVaultDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  mealPlanEntries!: Table<MealPlanEntry, string>;
  groceryLists!: Table<GroceryList, string>;

  constructor() {
    super("RecipeVaultDB");
    this.version(1).stores({
      recipes: "id, title, createdAt, updatedAt, favorite, *tags",
      mealPlanEntries: "id, weekStart, day, mealType, recipeId, [weekStart+day+mealType]",
      groceryLists: "id, createdAt, weekStart",
    });
  }
}

let instance: RecipeVaultDatabase | null = null;

/**
 * Lazily creates (once) and returns the Dexie database instance. Must only
 * be called from client-side code (event handlers, effects, or components
 * rendered after mount) since IndexedDB doesn't exist during SSR.
 */
export function getDb(): RecipeVaultDatabase {
  if (typeof window === "undefined") {
    throw new Error("RecipeVault's database is only available in the browser.");
  }
  if (!instance) {
    instance = new RecipeVaultDatabase();
  }
  return instance;
}
