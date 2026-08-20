/**
 * Parses an ISO-8601 duration string (e.g. "PT1H30M", "PT15M", "P0DT0H45M0S")
 * as used by schema.org Recipe `prepTime`/`cookTime`/`totalTime` fields into
 * whole minutes. Returns null if the string can't be parsed.
 */
export function parseISODuration(input: string | null | undefined): number | null {
  if (!input) return null;
  const trimmed = input.trim();

  const isoMatch = trimmed.match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i,
  );
  if (isoMatch && trimmed.toUpperCase().startsWith("P")) {
    const [, days, hours, mins, secs] = isoMatch;
    if (days || hours || mins || secs) {
      const totalMinutes =
        (Number(days) || 0) * 24 * 60 +
        (Number(hours) || 0) * 60 +
        (Number(mins) || 0) +
        (Number(secs) || 0) / 60;
      return Math.round(totalMinutes);
    }
  }

  // Fallback: plain text like "1 hour 30 minutes" or "45 minutes" or "45 min"
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/i);
  if (hourMatch || minMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) : 0;
    const mins = minMatch ? Number(minMatch[1]) : 0;
    return Math.round(hours * 60 + mins);
  }

  const plainNumber = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (plainNumber) return Math.round(Number(plainNumber[1]));

  return null;
}

/** Converts whole minutes back into an ISO-8601 duration string, e.g. 90 -> "PT1H30M". */
export function minutesToISODuration(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  let out = "PT";
  if (h > 0) out += `${h}H`;
  if (m > 0 || h === 0) out += `${m}M`;
  return out;
}
