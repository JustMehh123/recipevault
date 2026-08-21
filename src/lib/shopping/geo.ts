import type { ShoppingRegion } from "@/lib/shopping/region";

/** Haversine distance in miles between two WGS-84 coordinates. */
export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 3958.8 * c;
}

export function formatDistance(miles: number | null, region: ShoppingRegion = "us"): string {
  if (miles === null || Number.isNaN(miles)) return "";
  if (region === "ca") {
    const km = miles * 1.60934;
    if (km < 0.2) return "< 0.2 km";
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function formatMoney(amount: number | null, region: ShoppingRegion = "us"): string {
  if (amount === null || Number.isNaN(amount)) return "See price";
  return new Intl.NumberFormat(region === "ca" ? "en-CA" : "en-US", {
    style: "currency",
    currency: region === "ca" ? "CAD" : "USD",
  }).format(amount);
}
