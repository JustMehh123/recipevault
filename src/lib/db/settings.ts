import { getDb } from "@/lib/db/client";
import type { SavedAddress, SettingsRecord } from "@/types";

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
