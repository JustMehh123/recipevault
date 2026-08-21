import { fetchJson } from "@/lib/shopping/http";
import { compactPostal, type ShoppingRegion } from "@/lib/shopping/region";

export interface FlippFlyerItem {
  id?: number;
  flyer_item_id?: number;
  flyer_id?: number;
  name?: string | null;
  merchant_name?: string | null;
  merchant_id?: number;
  current_price?: number | string | null;
  original_price?: number | string | null;
  sale_story?: string | null;
  clean_image_url?: string | null;
  clipping_image_url?: string | null;
}

export interface FlippEcomItem {
  name?: string | null;
  merchant?: string | null;
  current_price?: number | string | null;
  original_price?: number | string | null;
  image_url?: string | null;
  item_id?: string | number | null;
  sku?: string | null;
}

interface FlippSearchResponse {
  items?: FlippFlyerItem[];
  ecom_items?: FlippEcomItem[];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function parseFlippPrice(value: unknown): number | null {
  const n = toNumber(value);
  if (n === null) return null;
  if (n > 500) return null;
  return n;
}

export function flippItemUrl(item: FlippFlyerItem, region: ShoppingRegion): string {
  const id = item.flyer_item_id ?? item.id;
  const host = region === "ca" ? "https://flipp.com/en-ca/item" : "https://flipp.com/item";
  if (id) return `${host}/${id}`;
  return region === "ca" ? "https://flipp.com/en-ca" : "https://flipp.com";
}

async function flippQuery(
  query: string,
  postalCode: string,
  locale: string,
): Promise<{ items: FlippFlyerItem[]; ecom: FlippEcomItem[] }> {
  const url = new URL("https://backflipp.wishabi.com/flipp/items/search");
  url.searchParams.set("locale", locale);
  url.searchParams.set("postal_code", postalCode);
  url.searchParams.set("q", query);

  const data = await fetchJson<FlippSearchResponse>(url.toString(), {
    headers: { "User-Agent": "RecipeVault/1.0" },
    timeoutMs: 10000,
  });

  return {
    items: data.items ?? [],
    ecom: data.ecom_items ?? [],
  };
}

/**
 * Searches weekly grocery flyers and local e-commerce listings for an item
 * near a postal/ZIP code via Flipp. Uses en-ca + Canadian postal formatting
 * for Canadian addresses.
 */
export async function searchFlipp(
  query: string,
  postalCode: string,
  region: ShoppingRegion = "us",
): Promise<{ items: FlippFlyerItem[]; ecom: FlippEcomItem[] }> {
  const compact = compactPostal(postalCode);
  if (!compact) return { items: [], ecom: [] };

  const locale = region === "ca" ? "en-ca" : "en-us";
  // Canadian Flipp accepts both "M5V2T6" and "M5V 2T6"; try compact first.
  try {
    const result = await flippQuery(query, compact, locale);
    if (result.items.length > 0 || result.ecom.length > 0) return result;
    if (region === "ca" && compact.length === 6) {
      const spaced = `${compact.slice(0, 3)} ${compact.slice(3)}`;
      return await flippQuery(query, spaced, locale);
    }
    return result;
  } catch {
    if (region === "ca" && compact.length === 6) {
      const spaced = `${compact.slice(0, 3)} ${compact.slice(3)}`;
      return flippQuery(query, spaced, locale);
    }
    throw new Error("Flipp search failed");
  }
}
