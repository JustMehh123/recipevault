import { getDb } from "@/lib/db/client";
import type { SavedAddress, SettingsRecord } from "@/types";
import { DEFAULT_PANTRY_STAPLES } from "@/types";

const SETTINGS_KEY = "app";

export async function getSettings(): Promise<SettingsRecord> {
  const db = getDb();
  const row = await db.settings.get(SETTINGS_KEY);
  return row ?? { key: SETTINGS_KEY, address: null };
}

export async function getSavedAddress(): Promise<SavedAddress | null> {
  const settings = await getSettings();
  return settings.address ?? null;
}

export async function saveAddress(address: SavedAddress): Promise<void> {
  const db = getDb();
  const existing = await getSettings();
  await db.settings.put({ ...existing, key: SETTINGS_KEY, address });
}

export async function clearAddress(): Promise<void> {
  const db = getDb();
  const existing = await getSettings();
  await db.settings.put({ ...existing, key: SETTINGS_KEY, address: null });
}

export async function getPantryStaples(): Promise<string[]> {
  const settings = await getSettings();
  return settings.pantryStaples ?? DEFAULT_PANTRY_STAPLES;
}

export async function savePantryStaples(staples: string[]): Promise<void> {
  const db = getDb();
  const existing = await getSettings();
  const cleaned = Array.from(
    new Set(staples.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  ).sort();
  await db.settings.put({ ...existing, key: SETTINGS_KEY, pantryStaples: cleaned });
}

/** True when an ingredient name matches one of the shopper's pantry staples. */
export function isPantryStaple(name: string, staples: string[]): boolean {
  const normalized = name.toLowerCase().trim();
  return staples.some((staple) => normalized === staple || normalized.includes(staple));
}
