export type ShoppingRegion = "ca" | "us";

const CANADIAN_POSTAL = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
const US_ZIP = /^\d{5}(?:-\d{4})?$/;

export function isCanadianPostal(code: string): boolean {
  return CANADIAN_POSTAL.test(code.trim());
}

export function isUsZip(code: string): boolean {
  return US_ZIP.test(code.trim());
}

export function detectRegion(input: {
  country?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
}): ShoppingRegion {
  const code = (input.countryCode || "").toLowerCase();
  if (code === "ca" || code === "can") return "ca";
  if (code === "us" || code === "usa") return "us";
  if (/canada|canad/i.test(input.country || "")) return "ca";
  if (isCanadianPostal(input.postalCode || "")) return "ca";
  return "us";
}

/** Compact postal/ZIP for APIs: `M5V2T6` or `10001`. */
export function compactPostal(code: string): string {
  return code.toUpperCase().replace(/\s+/g, "");
}

/** Display form for Canada (`M5V 2T6`) or US (`10001`). */
export function formatPostalDisplay(code: string, region: ShoppingRegion): string {
  const compact = compactPostal(code);
  if (region === "ca" && compact.length === 6) {
    return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }
  return code.trim();
}

export function looksCanadianQuery(query: string): boolean {
  if (/[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d/i.test(query)) return true;
  if (/\bcanada\b/i.test(query)) return true;
  if (
    /\b(ontario|quebec|québec|alberta|manitoba|saskatchewan|yukon|nunavut|newfoundland|labrador|nova scotia|new brunswick|prince edward|british columbia)\b/i.test(
      query,
    )
  ) {
    return true;
  }
  return /(^|[\s,])(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)(\s|,|$)/i.test(query);
}
