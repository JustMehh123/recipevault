/* RecipeVault service worker.
 *
 * Goal: a cold launch with the network completely off must still boot the app.
 * That means precaching not just the HTML shells but the hashed Next.js JS/CSS
 * bundles those shells reference — otherwise iOS renders a blank screen.
 *
 * Recipe data itself already lives in IndexedDB and never needs the network.
 */

const CACHE_VERSION = "v3";
const CACHE_NAME = `recipevault-${CACHE_VERSION}`;

/** Every statically-rendered route, so any of them can cold-boot offline. */
const SHELL_ROUTES = [
  "/",
  "/recipes",
  "/recipes/new",
  "/planner",
  "/grocery",
  "/settings",
  "/offline",
];

const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

/**
 * Fetches each shell route, caches the HTML, and scrapes it for the
 * `/_next/static/...` bundles it depends on so those get cached too.
 * This keeps the worker build-tool agnostic — no manifest plugin needed.
 */
async function precacheEverything() {
  const cache = await caches.open(CACHE_NAME);
  const assetUrls = new Set();

  await Promise.all(
    SHELL_ROUTES.map(async (route) => {
      try {
        const response = await fetch(route, { cache: "reload", credentials: "same-origin" });
        if (!response.ok) return;
        const html = await response.clone().text();
        await cache.put(route, response);
        for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
          assetUrls.add(match[1]);
        }
      } catch {
        // A single failed route shouldn't abort the whole install.
      }
    }),
  );

  await Promise.all(
    [...STATIC_ASSETS, ...assetUrls].map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload", credentials: "same-origin" });
        if (response.ok) await cache.put(url, response);
      } catch {
        /* ignore individual asset failures */
      }
    }),
  );

  return assetUrls.size;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheEverything().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data === "SKIP_WAITING" || data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data?.type === "CACHE_NOW") {
    event.waitUntil(
      precacheEverything().then((count) => {
        event.source?.postMessage({ type: "CACHE_READY", assets: count });
      }),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Live data only — never serve a stale scrape or stale store prices.
  if (url.pathname.startsWith("/api/")) return;

  // Hashed bundles are immutable: cache-first is always safe and fastest.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

/**
 * Navigations are network-first so you always get fresh HTML when online.
 * Offline we serve the exact cached page; recipe detail pages you've opened
 * before are cached on visit, so they keep working with no connection.
 */
async function handleNavigation(request) {
  const url = new URL(request.url);

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await caches.match(url.pathname)) || (await caches.match(request, { ignoreSearch: true }));
    if (cached) return cached;

    const offline = await caches.match("/offline");
    if (offline) return offline;

    return new Response("You're offline. RecipeVault will be back when you reconnect.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
