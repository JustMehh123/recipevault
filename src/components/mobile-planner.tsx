"use client";

import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { addMealPlanEntry, clearDay, removeMealPlanEntry } from "@/lib/db/mealPlan";
import type { DayIndex, MealPlanEntry, MealType, Recipe } from "@/types";
import { DAY_NAMES, MEAL_TYPES } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addDays, cn, formatShortDate, toIsoDate } from "@/lib/utils";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

/**
 * Touch-friendly planner for phones: pick a day, then tap a meal slot to add a
 * recipe. Replaces the desktop drag-and-drop grid below the `md` breakpoint,
 * where a 7-column grid would require awkward horizontal scrolling.
 */
export function MobilePlanner({ weekStart }: { weekStart: string }) {
  const todayIso = React.useMemo(() => toIsoDate(new Date()), []);

  const initialDay = React.useMemo(() => {
    const index = DAY_NAMES.findIndex((_, i) => addDays(weekStart, i) === todayIso);
    return (index >= 0 ? index : 0) as DayIndex;
  }, [weekStart, todayIso]);

  const [selectedDay, setSelectedDay] = React.useState<DayIndex>(initialDay);
  const [pickerSlot, setPickerSlot] = React.useState<MealType | null>(null);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => setSelectedDay(initialDay), [initialDay]);

  const entries = useLiveQuery(
    async () => getDb().mealPlanEntries.where("weekStart").equals(weekStart).toArray(),
    [weekStart],
  );

  const recipes = useLiveQuery(async () => getDb().recipes.orderBy("title").toArray(), [], []);

  const recipeMap = React.useMemo(() => {
    const map = new Map<string, Recipe>();
    (recipes ?? []).forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  const dayEntries = React.useMemo(() => {
    const map = new Map<MealType, MealPlanEntry[]>();
    MEAL_TYPES.forEach((m) => map.set(m, []));
    (entries ?? [])
      .filter((e) => e.day === selectedDay)
      .forEach((e) => map.get(e.mealType)?.push(e));
    return map;
  }, [entries, selectedDay]);

  const filteredRecipes = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recipes ?? [];
    return (recipes ?? []).filter((r) => r.title.toLowerCase().includes(query));
  }, [recipes, search]);

  async function handleAdd(recipe: Recipe) {
    if (!pickerSlot) return;
    await addMealPlanEntry({
      weekStart,
      day: selectedDay,
      mealType: pickerSlot,
      recipeId: recipe.id,
      servings: recipe.servings,
    });
    toast.success(`Added ${recipe.title} to ${MEAL_LABELS[pickerSlot]}.`);
    setPickerSlot(null);
    setSearch("");
  }

  const dayTotal = (entries ?? []).filter((e) => e.day === selectedDay).length;

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {DAY_NAMES.map((day, i) => {
          const date = addDays(weekStart, i);
          const active = selectedDay === i;
          const count = (entries ?? []).filter((e) => e.day === i).length;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(i as DayIndex)}
              aria-pressed={active}
              className={cn(
                "flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition-colors",
                active
                  ? "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--card)]",
                !active && date === todayIso && "border-[var(--primary)]",
              )}
            >
              <span className="text-xs font-semibold">{day.slice(0, 3)}</span>
              <span className={cn("text-[10px]", active ? "opacity-80" : "text-[var(--muted-foreground)]")}>
                {formatShortDate(date)}
              </span>
              <span
                className={cn(
                  "mt-1 h-1.5 w-1.5 rounded-full",
                  count > 0 ? (active ? "bg-current" : "bg-[var(--accent)]") : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {DAY_NAMES[selectedDay]} · {formatShortDate(addDays(weekStart, selectedDay))}
        </h2>
        {dayTotal > 0 && (
          <button
            type="button"
            onClick={async () => {
              await clearDay(weekStart, selectedDay);
              toast.success(`Cleared ${DAY_NAMES[selectedDay]}.`);
            }}
            className="text-xs text-[var(--muted-foreground)] underline underline-offset-2"
          >
            Clear day
          </button>
        )}
      </div>

      {MEAL_TYPES.map((mealType) => {
        const slotEntries = dayEntries.get(mealType) ?? [];
        return (
          <section key={mealType} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {MEAL_LABELS[mealType]}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setPickerSlot(mealType)}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            {slotEntries.length === 0 ? (
              <button
                type="button"
                onClick={() => setPickerSlot(mealType)}
                className="w-full rounded-lg border border-dashed border-[var(--border)] py-3 text-xs text-[var(--muted-foreground)]"
              >
                Nothing planned — tap to add
              </button>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {slotEntries.map((entry) => {
                  const recipe = recipeMap.get(entry.recipeId);
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-2 rounded-lg bg-[var(--muted)]/50 px-2.5 py-2"
                    >
                      <Link
                        href={recipe ? `/recipes/${recipe.id}` : "#"}
                        className="min-w-0 flex-1"
                      >
                        <span className="block truncate text-sm font-medium">
                          {recipe?.title ?? "Deleted recipe"}
                        </span>
                        <span className="block text-[11px] text-[var(--muted-foreground)]">
                          {entry.servings} servings
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeMealPlanEntry(entry.id)}
                        aria-label="Remove from plan"
                        className="rounded-lg p-2 text-[var(--muted-foreground)] hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <Dialog open={pickerSlot !== null} onOpenChange={(open) => !open && setPickerSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add to {pickerSlot ? MEAL_LABELS[pickerSlot] : ""} · {DAY_NAMES[selectedDay]}
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes…"
              className="pl-9"
            />
          </div>
          <ul className="flex max-h-[55vh] flex-col gap-1 overflow-y-auto">
            {filteredRecipes.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                No recipes found.
              </p>
            )}
            {filteredRecipes.map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => handleAdd(recipe)}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--muted)]"
                >
                  <span className="block truncate font-medium">{recipe.title}</span>
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    {recipe.servings} servings
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
