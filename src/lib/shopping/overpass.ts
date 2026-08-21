import type { NearbyStore } from "@/types";
import { milesBetween } from "@/lib/shopping/geo";
import { OSM_USER_AGENT } from "@/lib/shopping/http";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function formatOsmAddress(tags: Record<string, string>): string | null {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

async function queryOverpass(endpoint: string, body: string): Promise<OverpassResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": OSM_USER_AGENT,
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(body)}`,
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    return (await response.json()) as OverpassResponse;
  } finally {
    clearTimeout(timer);
  }
}

/** Finds grocery-type shops within ~5 miles of a coordinate using OpenStreetMap. */
export async function fetchNearbyStores(lat: number, lng: number): Promise<NearbyStore[]> {
  const query = `[out:json][timeout:20];
(
  nwr["shop"~"^(supermarket|grocery|convenience|greengrocer|butcher|bakery|wholesale)$"](around:8000,${lat},${lng});
);
out center tags 40;`;

  let data: OverpassResponse | null = null;
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      data = await queryOverpass(endpoint, query);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!data) {
    throw lastError instanceof Error ? lastError : new Error("Couldn't load nearby stores.");
  }

  const stores: NearbyStore[] = [];
  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags.name || tags.brand;
    if (!name) continue;
    const pointLat = el.lat ?? el.center?.lat;
    const pointLng = el.lon ?? el.center?.lon;
    if (pointLat == null || pointLng == null) continue;
    stores.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      brand: tags.brand ?? null,
      shopType: tags.shop ?? null,
      address: formatOsmAddress(tags),
      lat: pointLat,
      lng: pointLng,
      distanceMiles: milesBetween(lat, lng, pointLat, pointLng),
    });
  }

  stores.sort((a, b) => a.distanceMiles - b.distanceMiles);
  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = store.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
