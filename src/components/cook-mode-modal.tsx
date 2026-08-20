"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import {
  X,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sun,
  MonitorOff,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { scaleIngredients, displayIngredient } from "@/lib/parser/ingredients";
import { cn } from "@/lib/utils";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
}

interface CookModeModalProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CookModeModal({ recipe, open, onOpenChange }: CookModeModalProps) {
  const [servings, setServings] = React.useState(recipe.servings);
  const [checkedIngredients, setCheckedIngredients] = React.useState<Set<string>>(new Set());
  const [stepIndex, setStepIndex] = React.useState(0);
  const [wakeLockActive, setWakeLockActive] = React.useState(false);
  const wakeLockRef = React.useRef<WakeLockSentinelLike | null>(null);

  const releaseWakeLock = React.useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
    setWakeLockActive(false);
  }, []);

  React.useEffect(() => {
    if (open) {
      setServings(recipe.servings);
      setCheckedIngredients(new Set());
      setStepIndex(0);
    } else {
      releaseWakeLock();
    }
  }, [open, recipe.id, recipe.servings, releaseWakeLock]);

  React.useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  async function toggleWakeLock() {
    if (wakeLockActive) {
      await releaseWakeLock();
      return;
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) {
      toast.error("Screen wake lock isn't supported in this browser.");
      return;
    }
    try {
      const sentinel = await nav.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.("release", () => setWakeLockActive(false));
      toast.success("Screen will stay on while you cook.");
    } catch {
      toast.error("Couldn't keep the screen on — try again.");
    }
  }

  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  const scaledIngredients = React.useMemo(
    () => scaleIngredients(recipe.ingredients, factor),
    [recipe.ingredients, factor],
  );

  function toggleIngredient(id: string) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalSteps = recipe.instructions.length;

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setStepIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, totalSteps]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-[var(--background)] text-[var(--foreground)] focus:outline-none">
          <DialogPrimitive.Title className="sr-only">Cook Mode: {recipe.title}</DialogPrimitive.Title>
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Cook Mode</p>
              <h2 className="text-lg font-semibold leading-tight sm:text-xl">{recipe.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={wakeLockActive ? "default" : "outline"}
                size="sm"
                onClick={toggleWakeLock}
                title="Keep screen awake while cooking"
              >
                {wakeLockActive ? <Sun className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
                {wakeLockActive ? "Screen On" : "Keep Awake"}
              </Button>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Exit cook mode">
                  <X className="h-5 w-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            <aside className="flex flex-col gap-3 overflow-y-auto border-b border-[var(--border)] p-4 sm:p-6 lg:w-80 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between rounded-xl bg-[var(--muted)] p-3">
                <span className="text-sm font-medium">Servings</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setServings((s) => Math.max(1, s - 1))}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center font-semibold">{servings}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setServings((s) => s + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Ingredients
              </p>
              <ul className="flex flex-col gap-1">
                {scaledIngredients.map((ingredient) => {
                  const checked = checkedIngredients.has(ingredient.id);
                  return (
                    <li key={ingredient.id}>
                      <button
                        type="button"
                        onClick={() => toggleIngredient(ingredient.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--muted)]",
                          checked && "text-[var(--muted-foreground)] line-through",
                        )}
                      >
                        {checked ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                        )}
                        {displayIngredient(ingredient)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <main className="flex flex-1 flex-col justify-between overflow-y-auto p-6 sm:p-10">
              {totalSteps === 0 ? (
                <p className="text-[var(--muted-foreground)]">No instructions were saved for this recipe.</p>
              ) : (
                <>
                  <div>
                    <p className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">
                      Step {stepIndex + 1} of {totalSteps}
                    </p>
                    <p className="text-2xl font-medium leading-relaxed sm:text-3xl">
                      {recipe.instructions[stepIndex]}
                    </p>
                  </div>

                  <div className="mt-10 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                      disabled={stepIndex === 0}
                    >
                      <ChevronLeft className="h-5 w-5" /> Previous
                    </Button>
                    <div className="flex gap-1.5">
                      {recipe.instructions.map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 w-5 rounded-full bg-[var(--muted)]",
                            i === stepIndex && "bg-[var(--primary)]",
                            i < stepIndex && "bg-[var(--accent)]",
                          )}
                        />
                      ))}
                    </div>
                    <Button
                      size="lg"
                      onClick={() => setStepIndex((i) => Math.min(totalSteps - 1, i + 1))}
                      disabled={stepIndex === totalSteps - 1}
                    >
                      Next <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="mt-3 hidden text-center text-xs text-[var(--muted-foreground)] sm:block">
                    Use the ← and → arrow keys to move between steps.
                  </p>
                </>
              )}
            </main>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
