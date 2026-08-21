import type { SavedAddress } from "@/types";
import { fetchJson, OSM_USER_AGENT } from "@/lib/shopping/http";
import { isCanadianPostal, looksCanadianQuery } from "@/lib/shopping/region";

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  province?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

function extractPostalCode(text: string): string {
  const ca = text.match(/\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d)\b/i);
  if (ca) return ca[1].toUpperCase().replace(/\s+/g, "");
  const us = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (us) return us[1];
  return "";
}

function formatCaPostal(code: string): string {
  const compact = code.toUpperCase().replace(/\s+/g, "");
  if (isCanadianPostal(compact) && compact.length === 6) {
    return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }
  return code.trim();
}

function toSavedAddress(result: NominatimResult, query: string): SavedAddress {
  const addr = result.address ?? {};
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || "";
  const line1 = [addr.house_number, addr.road].filter(Boolean).join(" ");
  const rawPostal = (addr.postcode || "").split(";")[0].trim() || extractPostalCode(result.display_name);
  const countryCode = (addr.country_code || "").toLowerCase();
  const postalCode = countryCode === "ca" || isCanadianPostal(rawPostal) ? formatCaPostal(rawPostal) : rawPostal;
  return {
    query,
    formatted: result.display_name,
    line1: line1 || query,
    city,
    state: addr.state || addr.province || addr.county || "",
    postalCode,
    country: addr.country || "",
    countryCode,
    lat: Number(result.lat),
    lng: Number(result.lon),
    updatedAt: Date.now(),
  };
}

async function nominatimSearch(query: string, countrycodes?: string): Promise<NominatimResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  if (countrycodes) url.searchParams.set("countrycodes", countrycodes);

  return fetchJson<NominatimResult[]>(url.toString(), {
    headers: { "User-Agent": OSM_USER_AGENT, "Accept-Language": "en" },
  });
}

export async function geocodeAddress(query: string): Promise<SavedAddress> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Enter an address first.");

  const canadian = looksCanadianQuery(trimmed);
  const searches: Array<{ q: string; country?: string }> = canadian
    ? [
        { q: /canada/i.test(trimmed) ? trimmed : `${trimmed}, Canada`, country: "ca" },
        { q: trimmed, country: "ca" },
      ]
    : [{ q: trimmed }];

  let lastError: Error | null = null;
  for (const attempt of searches) {
    try {
      const results = await nominatimSearch(attempt.q, attempt.country);
      if (results.length) return toSavedAddress(results[0], trimmed);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Geocoding failed");
    }
  }

  if (lastError) throw lastError;
  throw new Error("Couldn't find that address. Try a street, city, and postal code (e.g. M5V 2T6).");
}

export async function reverseGeocode(lat: number, lng: number): Promise<SavedAddress> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const result = await fetchJson<NominatimResult>(url.toString(), {
    headers: { "User-Agent": OSM_USER_AGENT, "Accept-Language": "en" },
  });

  if (!result?.lat) {
    throw new Error("Couldn't resolve that location to an address.");
  }
  return toSavedAddress(result, result.display_name);
}
