import type { GroceryDeal, NearbyStore } from "@/types";
import { isGroceryMerchant, productSearchUrl } from "@/lib/shopping/chains";
import { formatMoney } from "@/lib/shopping/geo";
import { flippItemUrl, parseFlippPrice, searchFlipp, type FlippFlyerItem } from "@/lib/shopping/flipp";
import { fetchNearbyStores } from "@/lib/shopping/overpass";
import { detectRegion, type ShoppingRegion } from "@/lib/shopping/region";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function queryTokens(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((t) => t.length > 2 && !["the", "and", "for", "with", "fresh"].includes(t));
}

function isRelevant(itemName: string, query: string): boolean {
  const name = normalize(itemName);
  const q = normalize(query);
  if (!name || !q) return false;
  if (name.includes(q) || q.includes(name)) return true;
  const tokens = queryTokens(query);
  if (tokens.length === 0) return name.includes(q.slice(0, 4));
  const hits = tokens.filter((t) => name.includes(t)).length;
  return hits >= Math.min(tokens.length, 1);
}

function namesMatch(a: string, b: string): boolean {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function matchNearby(stores: NearbyStore[], merchant: string): NearbyStore | undefined {
  return stores.find((s) => namesMatch(s.name, merchant) || (s.brand ? namesMatch(s.brand, merchant) : false));
}

function dealId(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((p) => String(p ?? ""))
    .join("-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/**
 * Combines nearby OpenStreetMap grocery stores with Flipp weekly-ad prices
 * for a shopping item. Each deal includes a product URL on the store's
 * website (or Flipp / Google Shopping as a fallback).
 */
export async function findGroceryDeals(params: {
  query: string;
  postalCode: string;
  lat: number;
  lng: number;
  country?: string;
  countryCode?: string;
}): Promise<GroceryDeal[]> {
  const query = params.query.trim();
  const region: ShoppingRegion = detectRegion({
    country: params.country,
    countryCode: params.countryCode,
    postalCode: params.postalCode,
  });

  const [stores, flipp] = await Promise.all([
    fetchNearbyStores(params.lat, params.lng).catch(() => [] as NearbyStore[]),
    searchFlipp(query, params.postalCode, region).catch(() => ({ items: [] as FlippFlyerItem[], ecom: [] })),
  ]);

  const deals: GroceryDeal[] = [];
  const pricedStores = new Set<string>();

  for (const item of flipp.items) {
    const itemName = item.name?.trim();
    if (!itemName) continue;
    if (!isRelevant(itemName, query)) continue;
    const storeName = (item.merchant_name || "Local store").trim();
    const price = parseFlippPrice(item.current_price);
    const original = parseFlippPrice(item.original_price);
    const nearby = matchNearby(stores, storeName);
    const searchUrl = productSearchUrl(storeName, query, region);
    const flippUrl = flippItemUrl(item, region);
    deals.push({
      id: dealId(["flyer", item.flyer_item_id, storeName, itemName]),
      storeName,
      itemName,
      price,
      originalPrice: original,
      priceLabel: formatMoney(price, region),
      saleStory: item.sale_story ?? null,
      distanceMiles: nearby?.distanceMiles ?? null,
      address: nearby?.address ?? null,
      productUrl: searchUrl || flippUrl,
      imageUrl: item.clean_image_url || item.clipping_image_url || null,
      source: "flyer",
    });
    pricedStores.add(normalize(storeName));
  }

  for (const item of flipp.ecom) {
    const itemName = item.name?.trim();
    const storeName = item.merchant?.trim();
    if (!itemName || !storeName) continue;
    if (!isGroceryMerchant(storeName)) continue;
    if (!isRelevant(itemName, query)) continue;
    const price = parseFlippPrice(item.current_price);
    const nearby = matchNearby(stores, storeName);
    deals.push({
      id: dealId(["ecom", storeName, item.item_id, itemName]),
      storeName,
      itemName,
      price,
      originalPrice: parseFlippPrice(item.original_price),
      priceLabel: formatMoney(price, region),
      saleStory: null,
      distanceMiles: nearby?.distanceMiles ?? null,
      address: nearby?.address ?? null,
      productUrl: productSearchUrl(storeName, query, region),
      imageUrl: item.image_url ?? null,
      source: "ecom",
    });
    pricedStores.add(normalize(storeName));
  }

  for (const store of stores) {
    const key = normalize(store.name);
    if (pricedStores.has(key)) continue;
    if (store.brand && pricedStores.has(normalize(store.brand))) continue;
    deals.push({
      id: dealId(["nearby", store.id]),
      storeName: store.name,
      itemName: query,
      price: null,
      originalPrice: null,
      priceLabel: "See price",
      saleStory: null,
      distanceMiles: store.distanceMiles,
      address: store.address,
      productUrl: productSearchUrl(store.brand || store.name, query, region),
      imageUrl: null,
      source: "nearby",
    });
  }

  const unique = new Map<string, GroceryDeal>();
  for (const deal of deals) {
    const key = `${normalize(deal.storeName)}|${normalize(deal.itemName)}`;
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, deal);
      continue;
    }
    const existingPrice = existing.price ?? Number.POSITIVE_INFINITY;
    const nextPrice = deal.price ?? Number.POSITIVE_INFINITY;
    if (nextPrice < existingPrice) unique.set(key, deal);
  }

  return Array.from(unique.values())
    .sort((a, b) => {
      const aPriced = a.price === null ? 1 : 0;
      const bPriced = b.price === null ? 1 : 0;
      if (aPriced !== bPriced) return aPriced - bPriced;
      if (a.price != null && b.price != null && a.price !== b.price) return a.price - b.price;
      const aDist = a.distanceMiles ?? 999;
      const bDist = b.distanceMiles ?? 999;
      return aDist - bDist;
    })
    .slice(0, 24);
}
