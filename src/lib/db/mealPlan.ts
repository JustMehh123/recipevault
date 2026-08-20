import { getDb } from "@/lib/db/client";
import type { DayIndex, MealPlanEntry, MealType } from "@/types";
import { generateId } from "@/lib/utils";

export async function getWeekEntries(weekStart: string): Promise<MealPlanEntry[]> {
  const db = getDb();
  return db.mealPlanEntries.where("weekStart").equals(weekStart).toArray();
}

export async function addMealPlanEntry(params: {
  weekStart: string;
  day: DayIndex;
  mealType: MealType;
  recipeId: string;
  servings: number;
}): Promise<string> {
  const db = getDb();
  const entry: MealPlanEntry = {
    id: generateId(),
    ...params,
    createdAt: Date.now(),
  };
  await db.mealPlanEntries.put(entry);
  return entry.id;
}

export async function moveMealPlanEntry(
  id: string,
  day: DayIndex,
  mealType: MealType,
): Promise<void> {
  const db = getDb();
  await db.mealPlanEntries.update(id, { day, mealType });
}

export async function updateEntryServings(id: string, servings: number): Promise<void> {
  const db = getDb();
  await db.mealPlanEntries.update(id, { servings });
}

export async function removeMealPlanEntry(id: string): Promise<void> {
  const db = getDb();
  await db.mealPlanEntries.delete(id);
}

export async function clearWeek(weekStart: string): Promise<void> {
  const db = getDb();
  await db.mealPlanEntries.where("weekStart").equals(weekStart).delete();
}
