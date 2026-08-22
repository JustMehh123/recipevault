/** A cooking duration detected inside an instruction step. */
export interface DetectedTimer {
  /** Human label, e.g. "25 min" or "1 hr 30 min". */
  label: string;
  seconds: number;
}

const DURATION_REGEX =
  /(\d+(?:\.\d+)?)\s*(?:(?:to|-|–|or)\s*(\d+(?:\.\d+)?)\s*)?(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;

function unitToSeconds(unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("s")) return 1;
  if (u.startsWith("h")) return 3600;
  return 60;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (hours > 0) return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  if (minutes > 0) return seconds > 0 ? `${minutes} min ${seconds}s` : `${minutes} min`;
  return `${seconds}s`;
}

/** Formats remaining time as a clock, e.g. "04:31" or "1:02:07". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Finds every cooking duration mentioned in a step ("about 7 minutes",
 * "2 to 3 hours") so Cook Mode can offer one-tap timers. Ranges use the
 * longer end so nothing burns while you look away.
 */
export function detectTimers(step: string): DetectedTimer[] {
  const found: DetectedTimer[] = [];
  const seen = new Set<number>();

  for (const match of step.matchAll(DURATION_REGEX)) {
    const first = Number(match[1]);
    const second = match[2] ? Number(match[2]) : null;
    const multiplier = unitToSeconds(match[3]);
    const amount = second !== null ? Math.max(first, second) : first;
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const seconds = Math.round(amount * multiplier);
    // Ignore absurd values (e.g. "350 minutes" from a mis-parse) and duplicates.
    if (seconds < 5 || seconds > 24 * 3600) continue;
    if (seen.has(seconds)) continue;

    seen.add(seconds);
    found.push({ label: formatDuration(seconds), seconds });
  }

  return found.slice(0, 3);
}
