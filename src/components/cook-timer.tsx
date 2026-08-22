"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pause, Play, RotateCcw, Timer as TimerIcon, X } from "lucide-react";
import { formatClock, type DetectedTimer } from "@/lib/parser/timers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Plays a short chime using WebAudio so no audio asset is required. */
function playChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;

    [880, 1320, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.28;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    });

    setTimeout(() => ctx.close().catch(() => undefined), 1400);
  } catch {
    // Audio is a nicety — never let it break the timer.
  }
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remaining: number;
  running: boolean;
}

export function useCookTimer() {
  const [timer, setTimer] = React.useState<ActiveTimer | null>(null);
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (!timer || !timer.running) return;
    const interval = setInterval(() => {
      setTimer((current) => {
        if (!current || !current.running) return current;
        const remaining = current.remaining - 1;
        return { ...current, remaining: Math.max(0, remaining), running: remaining > 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  React.useEffect(() => {
    if (!timer) {
      firedRef.current = false;
      return;
    }
    if (timer.remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      playChime();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
      toast.success(`Timer finished — ${timer.label}`, { duration: 10000 });
    }
    if (timer.remaining > 0) firedRef.current = false;
  }, [timer]);

  const start = React.useCallback((detected: DetectedTimer) => {
    setTimer({
      id: `${detected.seconds}-${Date.now()}`,
      label: detected.label,
      totalSeconds: detected.seconds,
      remaining: detected.seconds,
      running: true,
    });
  }, []);

  const toggle = React.useCallback(() => {
    setTimer((current) =>
      current ? { ...current, running: !current.running && current.remaining > 0 } : current,
    );
  }, []);

  const reset = React.useCallback(() => {
    setTimer((current) =>
      current ? { ...current, remaining: current.totalSeconds, running: true } : current,
    );
  }, []);

  const clear = React.useCallback(() => setTimer(null), []);

  return { timer, start, toggle, reset, clear };
}

export function TimerChips({
  timers,
  onStart,
}: {
  timers: DetectedTimer[];
  onStart: (timer: DetectedTimer) => void;
}) {
  if (timers.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        Timers
      </span>
      {timers.map((timer) => (
        <button
          key={timer.seconds}
          type="button"
          onClick={() => onStart(timer)}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          <TimerIcon className="h-3.5 w-3.5" />
          Start {timer.label}
        </button>
      ))}
    </div>
  );
}

export function TimerBar({
  timer,
  onToggle,
  onReset,
  onClear,
}: {
  timer: ActiveTimer;
  onToggle: () => void;
  onReset: () => void;
  onClear: () => void;
}) {
  const done = timer.remaining === 0;
  const progress = timer.totalSeconds > 0 ? 1 - timer.remaining / timer.totalSeconds : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-[var(--border)] px-4 py-2.5 sm:px-6",
        done ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--muted)]",
      )}
      role="status"
      aria-live="polite"
    >
      <TimerIcon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-semibold tabular-nums">
            {formatClock(timer.remaining)}
          </span>
          <span className="truncate text-xs opacity-80">
            {done ? "Time's up!" : timer.label}
          </span>
        </div>
        {!done && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
        )}
      </div>
      {!done && (
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label={timer.running ? "Pause timer" : "Resume timer"}>
          {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onReset} aria-label="Restart timer">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onClear} aria-label="Dismiss timer">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
