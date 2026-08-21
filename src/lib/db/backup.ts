import { getDb } from "@/lib/db/client";
import type { GroceryList, MealPlanEntry, Recipe, SettingsRecord } from "@/types";

/** Shape of the JSON file produced by `exportBackup` / accepted by `importBackup`. */
export interface RecipeVaultBackup {
  format: "recipevault-backup";
  version: 1 | 2;
  exportedAt: string;
  recipes: Recipe[];
  mealPlanEntries: MealPlanEntry[];
  groceryLists: GroceryList[];
  settings?: SettingsRecord[];
}

/** Serializes every local table into a single downloadable JSON backup. */
export async function exportBackup(): Promise<RecipeVaultBackup> {
  const db = getDb();
  const [recipes, mealPlanEntries, groceryLists, settings] = await Promise.all([
    db.recipes.toArray(),
    db.mealPlanEntries.toArray(),
    db.groceryLists.toArray(),
    db.settings.toArray(),
  ]);

  return {
    format: "recipevault-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    recipes,
    mealPlanEntries,
    groceryLists,
    settings,
  };
}

export function downloadBackupFile(backup: RecipeVaultBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStamp = backup.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `recipevault-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export class BackupImportError extends Error {}

function isValidBackup(value: unknown): value is RecipeVaultBackup {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.format === "recipevault-backup" &&
    Array.isArray(obj.recipes) &&
    Array.isArray(obj.mealPlanEntries) &&
    Array.isArray(obj.groceryLists)
  );
}

export type ImportMode = "merge" | "replace";

/**
 * Restores a previously exported backup. In "replace" mode, all existing
 * local data is wiped first; in "merge" mode, records are upserted by id
 * (existing records with matching ids are overwritten).
 */
export async function importBackup(raw: unknown, mode: ImportMode = "merge"): Promise<{
  recipes: number;
  mealPlanEntries: number;
  groceryLists: number;
}> {
  if (!isValidBackup(raw)) {
    throw new BackupImportError("That file doesn't look like a valid RecipeVault backup.");
  }

  const db = getDb();
  await db.transaction("rw", db.recipes, db.mealPlanEntries, db.groceryLists, db.settings, async () => {
    if (mode === "replace") {
      await Promise.all([
        db.recipes.clear(),
        db.mealPlanEntries.clear(),
        db.groceryLists.clear(),
        db.settings.clear(),
      ]);
    }
    await db.recipes.bulkPut(raw.recipes);
    await db.mealPlanEntries.bulkPut(raw.mealPlanEntries);
    await db.groceryLists.bulkPut(raw.groceryLists);
    if (raw.settings?.length) {
      await db.settings.bulkPut(raw.settings);
    }
  });

  return {
    recipes: raw.recipes.length,
    mealPlanEntries: raw.mealPlanEntries.length,
    groceryLists: raw.groceryLists.length,
  };
}

export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.recipes, db.mealPlanEntries, db.groceryLists, db.settings, async () => {
    await Promise.all([
      db.recipes.clear(),
      db.mealPlanEntries.clear(),
      db.groceryLists.clear(),
      db.settings.clear(),
    ]);
  });
}
