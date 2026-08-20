"use client";

import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { X, GripVertical, Search } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { addMealPlanEntry, moveMealPlanEntry, removeMealPlanEntry } from "@/lib/db/mealPlan";
import type { MealPlanEntry, MealType, Recipe, DayIndex } from "@/types";
import { DAY_NAMES, MEAL_TYPES } from "@/types";
import { Input } from "@/components/ui/input";
import { cn, addDays, formatShortDate } from "@/lib/utils";

interface DragPayload {
  type: "new" | "move";
  recipeId?: string;
  entryId?: string;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export function WeeklyGrid({ weekStart }: { weekStart: string }) {
  const entries = useLiveQuery(async () => {
    const db = getDb();
    return db.mealPlanEntries.where("weekStart").equals(weekStart).toArray();
  }, [weekStart]);

  const recipes = useLiveQuery(async () => {
    const db = getDb();
    return db.recipes.orderBy("title").toArray();
  }, [], []);

  const [search, setSearch] = React.useState("");
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  const recipeMap = React.useMemo(() => {
    const map = new Map<string, Recipe>();
    (recipes ?? []).forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  const entriesBySlot = React.useMemo(() => {
    const map = new Map<string, MealPlanEntry[]>();
    (entries ?? []).forEach((entry) => {
      const key = `${entry.day}-${entry.mealType}`;
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    });
    return map;
  }, [entries]);

  const filteredRecipes = React.useMemo(() => {
    if (!recipes) return [];
    const query = search.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(query));
  }, [recipes, search]);

  function handleDrop(day: DayIndex, mealType: MealType, e: React.DragEvent) {
    e.preventDefault();
    setDragOverKey(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (payload.type === "new" && payload.recipeId) {
      const recipe = recipeMap.get(payload.recipeId);
      addMealPlanEntry({
        weekStart,
        day,
        mealType,
        recipeId: payload.recipeId,
        servings: recipe?.servings ?? 4,
      }).then(() => toast.success(`Added ${recipe?.title ?? "recipe"} to ${MEAL_LABELS[mealType]}.`));
    } else if (payload.type === "move" && payload.entryId) {
      moveMealPlanEntry(payload.entryId, day, mealType);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="order-2 flex-1 overflow-x-auto lg:order-1">
        <div className="grid min-w-[900px] grid-cols-[100px_repeat(7,1fr)] gap-2">
          <div />
          {DAY_NAMES.map((day, i) => (
            <div key={day} className="px-1 text-center">
              <p className="text-sm font-semibold">{day}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatShortDate(addDays(weekStart, i))}</p>
            </div>
          ))}

          {MEAL_TYPES.map((mealType) => (
            <React.Fragment key={mealType}>
              <div className="flex items-center px-1 text-sm font-medium text-[var(--muted-foreground)]">
                {MEAL_LABELS[mealType]}
              </div>
              {DAY_NAMES.map((_, dayIndex) => {
                const day = dayIndex as DayIndex;
                const key = `${day}-${mealType}`;
                const slotEntries = entriesBySlot.get(key) ?? [];
                const isOver = dragOverKey === key;
                return (
                  <div
                    key={key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverKey(key);
                    }}
                    onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                    onDrop={(e) => handleDrop(day, mealType, e)}
                    className={cn(
                      "flex min-h-[92px] flex-col gap-1.5 rounded-xl border border-dashed border-[var(--border)] p-1.5 transition-colors",
                      isOver && "drag-over",
                    )}
                  >
                    {slotEntries.map((entry) => {
                      const recipe = recipeMap.get(entry.recipeId);
                      return (
                        <div
                          key={entry.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "application/json",
                              JSON.stringify({ type: "move", entryId: entry.id } satisfies DragPayload),
                            );
                          }}
                          className="group flex items-center gap-1 rounded-lg bg-[var(--card)] border border-[var(--border)] px-2 py-1.5 text-xs shadow-sm"
                        >
                          <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-[var(--muted-foreground)]" />
                          <Link
                            href={recipe ? `/recipes/${recipe.id}` : "#"}
                            className="flex-1 truncate font-medium hover:underline"
                            title={recipe?.title}
                          >
                            {recipe?.title ?? "Deleted recipe"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeMealPlanEntry(entry.id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Remove from plan"
                          >
                            <X className="h-3 w-3 text-[var(--muted-foreground)] hover:text-red-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <aside className="order-1 flex w-full flex-col gap-3 lg:order-2 lg:w-72">
        <p className="text-sm font-semibold">Your Recipes</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search to drag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto pr-1">
          {filteredRecipes.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No recipes yet.</p>
          )}
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ type: "new", recipeId: recipe.id } satisfies DragPayload),
                );
              }}
              className="flex cursor-grab items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
              <span className="truncate">{recipe.title}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Drag a recipe onto any day &amp; meal slot. Drag a scheduled item between slots to reschedule it.
        </p>
      </aside>
    </div>
  );
}
