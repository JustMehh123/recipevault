/**
 * Core domain types for RecipeVault.
 * The app is local-first: all of these records live in the browser's
 * IndexedDB database (see `src/lib/db`) and never touch a server.
 */

/** A single parsed ingredient line, e.g. "2 1/2 cups flour, sifted". */
export interface Ingredient {
  id: string;
  /** The original, unparsed text exactly as entered/imported. */
  raw: string;
  /** Parsed numeric quantity (supports fractions & ranges collapsed to avg-free start value). */
  quantity: number | null;
  /** Parsed unit, normalized to lowercase singular form (cup, tbsp, g, ...). */
  unit: string | null;
  /** The ingredient name with quantity/unit stripped out. */
  name: string;
  /** Trailing free-text notes, e.g. "chopped", "room temperature". */
  notes: string | null;
}

export type RecipeTag =
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Dessert"
  | "Snack"
  | "Vegetarian"
  | "Vegan"
  | "Gluten-Free"
  | "Quick 15-Min"
  | "Slow Cook"
  | "Baking"
  | "Soup"
  | "Salad"
  | "Drink";

export const RECIPE_TAGS: RecipeTag[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Dessert",
  "Snack",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Quick 15-Min",
  "Slow Cook",
  "Baking",
  "Soup",
  "Salad",
  "Drink",
];

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  /** Minutes, if known. */
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  /** Number of servings this recipe's ingredient quantities are based on. */
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  cuisine: string | null;
  notes: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type MealType = "breakfast" | "lunch" | "dinner";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

/** One recipe scheduled on a specific day/meal slot of a given week. */
export interface MealPlanEntry {
  id: string;
  /** ISO date (yyyy-mm-dd) of the Monday that starts this entry's week. */
  weekStart: string;
  day: DayIndex;
  mealType: MealType;
  recipeId: string;
  /** Optional override of servings for this planned meal (defaults to recipe.servings). */
  servings: number;
  createdAt: number;
}

export type GroceryCategory =
  | "Produce"
  | "Meat & Seafood"
  | "Dairy & Eggs"
  | "Bakery"
  | "Pantry"
  | "Frozen"
  | "Spices & Condiments"
  | "Beverages"
  | "Other";

export const GROCERY_CATEGORIES: GroceryCategory[] = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Frozen",
  "Spices & Condiments",
  "Beverages",
  "Pantry",
  "Other",
];

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
  checked: boolean;
  /** Free-text notes, e.g. combined "raw" strings that couldn't be merged numerically. */
  notes: string | null;
  /** Recipe ids that contributed this ingredient. */
  sourceRecipeIds: string[];
  /** True if this line was added manually rather than generated from a plan. */
  manual: boolean;
}

export interface GroceryList {
  id: string;
  name: string;
  weekStart: string | null;
  items: GroceryItem[];
  createdAt: number;
  updatedAt: number;
}

/** Result of scraping a recipe from a URL — mirrors Recipe but without local-only fields. */
export interface ScrapedRecipe {
  title: string;
  description: string;
  image: string | null;
  sourceUrl: string;
  sourceName: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: number;
  ingredientLines: string[];
  instructions: string[];
  tags: string[];
  cuisine: string | null;
}

/** The shopper's saved location, used to find nearby grocery stores and prices. */
export interface SavedAddress {
  query: string;
  formatted: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  /** ISO 3166-1 alpha-2 when known, e.g. "ca" or "us". */
  countryCode?: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

export interface SettingsRecord {
  key: string;
  address: SavedAddress | null;
}

export interface NearbyStore {
  id: string;
  name: string;
  brand: string | null;
  shopType: string | null;
  address: string | null;
  lat: number;
  lng: number;
  distanceMiles: number;
}

export interface GroceryDeal {
  id: string;
  storeName: string;
  itemName: string;
  price: number | null;
  originalPrice: number | null;
  priceLabel: string;
  saleStory: string | null;
  distanceMiles: number | null;
  address: string | null;
  /** Product or store-search URL opened when the shopper taps the price. */
  productUrl: string;
  imageUrl: string | null;
  source: "flyer" | "ecom" | "nearby";
}
