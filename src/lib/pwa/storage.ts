/**
 * Storage durability helpers.
 *
 * Safari/WebKit clears "script-writable" storage (including IndexedDB) after
 * roughly 7 days of not using a site. That would silently delete a user's
 * recipes — unacceptable for a local-first app. Two things prevent it:
 *
 *  1. Installing to the Home Screen (home-screen web apps are exempt).
 *  2. Requesting persistent storage via the Storage Standard.
 *
 * We do both, and surface the status so users aren't guessing.
 */

export interface StorageStatus {
  supported: boolean;
  persisted: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return { supported: false, persisted: false, usageBytes: null, quotaBytes: null };
  }

  let persisted = false;
  try {
    persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
  } catch {
    persisted = false;
  }

  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  try {
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage ?? null;
      quotaBytes = estimate.quota ?? null;
    }
  } catch {
    /* estimate is best-effort */
  }

  return {
    supported: typeof navigator.storage.persist === "function",
    persisted,
    usageBytes,
    quotaBytes,
  };
}

/** Asks the browser to make storage persistent. Returns the resulting state. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
}

export interface OfflineCacheStatus {
  supported: boolean;
  cachedEntries: number;
  ready: boolean;
}

/** Reports how much of the app shell is cached for offline use. */
export async function getOfflineCacheStatus(): Promise<OfflineCacheStatus> {
  if (typeof caches === "undefined") {
    return { supported: false, cachedEntries: 0, ready: false };
  }
  try {
    const keys = await caches.keys();
    const name = keys.find((k) => k.startsWith("recipevault-"));
    if (!name) return { supported: true, cachedEntries: 0, ready: false };
    const cache = await caches.open(name);
    const entries = await cache.keys();
    // A working offline boot needs the shell HTML plus its JS bundles.
    const hasBundles = entries.some((r) => new URL(r.url).pathname.startsWith("/_next/static/"));
    return {
      supported: true,
      cachedEntries: entries.length,
      ready: entries.length > 0 && hasBundles,
    };
  } catch {
    return { supported: true, cachedEntries: 0, ready: false };
  }
}

/** Tells the active service worker to (re)download everything needed offline. */
export async function primeOfflineCache(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: "CACHE_NOW" });
}
