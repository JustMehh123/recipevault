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

export async function clearDay(weekStart: string, day: DayIndex): Promise<number> {
  const db = getDb();
  const entries = await db.mealPlanEntries.where("weekStart").equals(weekStart).toArray();
  const ids = entries.filter((e) => e.day === day).map((e) => e.id);
  await db.mealPlanEntries.bulkDelete(ids);
  return ids.length;
}

/**
 * Copies every meal scheduled in `fromWeek` into `toWeek`. Existing entries in
 * the target week are kept, so this is additive.
 */
export async function copyWeek(fromWeek: string, toWeek: string): Promise<number> {
  const db = getDb();
  const source = await db.mealPlanEntries.where("weekStart").equals(fromWeek).toArray();
  if (source.length === 0) return 0;

  const copies: MealPlanEntry[] = source.map((entry) => ({
    ...entry,
    id: generateId(),
    weekStart: toWeek,
    createdAt: Date.now(),
  }));

  await db.mealPlanEntries.bulkPut(copies);
  return copies.length;
}
