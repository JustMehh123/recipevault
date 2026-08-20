import { getDb } from "@/lib/db/client";
import type { Recipe, ScrapedRecipe } from "@/types";
import { generateId } from "@/lib/utils";
import { parseIngredientLines } from "@/lib/parser/ingredients";

/** Converts a freshly scraped/pasted recipe into a fully-formed local Recipe record. */
export function buildRecipeFromScraped(scraped: ScrapedRecipe, extraTags: string[] = []): Recipe {
  const now = Date.now();
  return {
    id: generateId(),
    title: scraped.title || "Untitled Recipe",
    description: scraped.description || "",
    image: scraped.image,
    sourceUrl: scraped.sourceUrl || null,
    sourceName: scraped.sourceName,
    prepTimeMinutes: scraped.prepTimeMinutes,
    cookTimeMinutes: scraped.cookTimeMinutes,
    totalTimeMinutes: scraped.totalTimeMinutes,
    servings: scraped.servings || 4,
    ingredients: parseIngredientLines(scraped.ingredientLines),
    instructions: scraped.instructions,
    tags: Array.from(new Set([...scraped.tags, ...extraTags])),
    cuisine: scraped.cuisine,
    notes: "",
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  const db = getDb();
  return db.recipes.orderBy("updatedAt").reverse().toArray();
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const db = getDb();
  return db.recipes.get(id);
}

export async function saveRecipe(recipe: Recipe): Promise<string> {
  const db = getDb();
  await db.recipes.put(recipe);
  return recipe.id;
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.recipes, db.mealPlanEntries, async () => {
    await db.recipes.delete(id);
    await db.mealPlanEntries.where("recipeId").equals(id).delete();
  });
}

export async function toggleFavorite(id: string): Promise<void> {
  const db = getDb();
  const recipe = await db.recipes.get(id);
  if (!recipe) return;
  await db.recipes.update(id, { favorite: !recipe.favorite, updatedAt: Date.now() });
}

export async function getAllTags(): Promise<string[]> {
  const db = getDb();
  const recipes = await db.recipes.toArray();
  const tags = new Set<string>();
  recipes.forEach((r) => r.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

/** Seeds a handful of ready-made recipes on first run so the app isn't empty. */
export async function seedSampleRecipesIfEmpty(): Promise<void> {
  const db = getDb();
  const count = await db.recipes.count();
  if (count > 0) return;

  const now = Date.now();
  const samples: Recipe[] = [
    {
      id: generateId(),
      title: "Fluffy Weekend Pancakes",
      description: "Light, buttery pancakes with crisp edges — the classic Saturday morning fix.",
      image: null,
      sourceUrl: null,
      sourceName: null,
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      totalTimeMinutes: 25,
      servings: 4,
      ingredients: parseIngredientLines([
        "2 cups all-purpose flour",
        "2 tablespoons sugar",
        "2 teaspoons baking powder",
        "1/2 teaspoon salt",
        "2 eggs",
        "1 1/2 cups milk",
        "1/4 cup butter, melted",
        "1 teaspoon vanilla extract",
      ]),
      instructions: [
        "Whisk together the flour, sugar, baking powder, and salt in a large bowl.",
        "In another bowl, beat the eggs, then mix in the milk, melted butter, and vanilla.",
        "Pour the wet ingredients into the dry ingredients and stir until just combined (a few lumps are fine).",
        "Heat a griddle over medium heat and lightly grease it.",
        "Pour 1/4 cup of batter per pancake and cook until bubbles form on top, then flip and cook until golden.",
        "Serve warm with butter and maple syrup.",
      ],
      tags: ["Breakfast", "Vegetarian"],
      cuisine: "American",
      notes: "",
      favorite: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: "15-Minute Garlic Butter Shrimp",
      description: "A quick weeknight dinner: juicy shrimp seared in garlicky butter and lemon.",
      image: null,
      sourceUrl: null,
      sourceName: null,
      prepTimeMinutes: 5,
      cookTimeMinutes: 10,
      totalTimeMinutes: 15,
      servings: 3,
      ingredients: parseIngredientLines([
        "1 pound shrimp, peeled and deveined",
        "3 tablespoons butter",
        "4 cloves garlic, minced",
        "1/2 teaspoon paprika",
        "1/4 teaspoon red pepper flakes",
        "1 lemon, juiced",
        "2 tablespoons parsley, chopped",
        "1/2 teaspoon salt",
      ]),
      instructions: [
        "Pat the shrimp dry and season with salt and paprika.",
        "Melt the butter in a large skillet over medium-high heat.",
        "Add the garlic and red pepper flakes and cook for 30 seconds until fragrant.",
        "Add the shrimp in a single layer and cook 2 minutes per side until pink and opaque.",
        "Remove from heat, stir in lemon juice and parsley, and serve immediately.",
      ],
      tags: ["Dinner", "Quick 15-Min"],
      cuisine: "American",
      notes: "",
      favorite: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: "Hearty Vegetarian Chili",
      description: "A big pot of smoky, bean-packed chili that's even better the next day.",
      image: null,
      sourceUrl: null,
      sourceName: null,
      prepTimeMinutes: 15,
      cookTimeMinutes: 40,
      totalTimeMinutes: 55,
      servings: 6,
      ingredients: parseIngredientLines([
        "2 tablespoons olive oil",
        "1 onion, diced",
        "1 red bell pepper, diced",
        "3 cloves garlic, minced",
        "2 tablespoons chili powder",
        "1 teaspoon cumin",
        "1 can black beans, drained",
        "1 can kidney beans, drained",
        "1 can corn, drained",
        "2 cans diced tomatoes",
        "2 cups vegetable broth",
        "1 teaspoon salt",
      ]),
      instructions: [
        "Heat the olive oil in a large pot over medium heat. Add the onion and bell pepper and cook until softened, about 5 minutes.",
        "Stir in the garlic, chili powder, and cumin and cook for 1 minute until fragrant.",
        "Add the beans, corn, diced tomatoes, and vegetable broth. Stir well.",
        "Bring to a simmer, then reduce heat and cook uncovered for 30-40 minutes, stirring occasionally.",
        "Season with salt to taste and serve with your favorite toppings.",
      ],
      tags: ["Dinner", "Vegetarian", "Vegan", "Soup"],
      cuisine: "Tex-Mex",
      notes: "",
      favorite: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.recipes.bulkAdd(samples);
}
