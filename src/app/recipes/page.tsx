"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search, ChefHat, X, SlidersHorizontal } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { seedSampleRecipesIfEmpty, toggleFavorite } from "@/lib/db/recipes";
import { UrlImporter } from "@/components/url-importer";
import { RecipeCard } from "@/components/recipe-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecipeCardSkeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types";

type SortKey = "recent" | "title" | "quickest" | "servings";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently updated",
  title: "Title (A–Z)",
  quickest: "Quickest first",
  servings: "Most servings",
};

/** Scores a recipe against a search query; higher is a better match. 0 = no match. */
function scoreRecipe(recipe: Recipe, query: string): number {
  if (!query) return 1;
  const title = recipe.title.toLowerCase();
  const tags = recipe.tags.join(" ").toLowerCase();
  const description = recipe.description.toLowerCase();
  const ingredients = recipe.ingredients.map((i) => i.name).join(" ").toLowerCase();

  const terms = query.split(/\s+/).filter(Boolean);
  let total = 0;

  for (const term of terms) {
    let termScore = 0;
    if (title.startsWith(term)) termScore = 100;
    else if (title.includes(term)) termScore = 60;
    else if (tags.includes(term)) termScore = 40;
    else if (ingredients.includes(term)) termScore = 20;
    else if (description.includes(term)) termScore = 10;

    if (termScore === 0) return 0; // every term must match somewhere
    total += termScore;
  }

  return total;
}

function RecipesPageInner() {
  const searchParams = useSearchParams();
  // PWA share target sends the page as `url`, but some browsers put it in `text`.
  const sharedRaw = searchParams.get("url") ?? searchParams.get("text") ?? "";
  const sharedUrl = React.useMemo(() => {
    const match = sharedRaw.match(/https?:\/\/\S+/);
    return match ? match[0] : null;
  }, [sharedRaw]);

  const [search, setSearch] = React.useState("");
  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>("recent");

  React.useEffect(() => {
    seedSampleRecipesIfEmpty().catch(() => undefined);
  }, []);

  const recipes = useLiveQuery(async () => {
    const db = getDb();
    return db.recipes.orderBy("updatedAt").reverse().toArray();
  }, []);

  const allTags = React.useMemo(() => {
    const counts = new Map<string, number>();
    (recipes ?? []).forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [recipes]);

  const filtered = React.useMemo(() => {
    if (!recipes) return [];
    const query = search.trim().toLowerCase();

    const matched = recipes
      .filter((recipe) => {
        if (favoritesOnly && !recipe.favorite) return false;
        if (activeTags.length > 0 && !activeTags.every((t) => recipe.tags.includes(t))) return false;
        return true;
      })
      .map((recipe) => ({ recipe, score: scoreRecipe(recipe, query) }))
      .filter((entry) => entry.score > 0);

    matched.sort((a, b) => {
      if (query && b.score !== a.score) return b.score - a.score;
      switch (sort) {
        case "title":
          return a.recipe.title.localeCompare(b.recipe.title);
        case "quickest": {
          const aTime = a.recipe.totalTimeMinutes ?? Number.POSITIVE_INFINITY;
          const bTime = b.recipe.totalTimeMinutes ?? Number.POSITIVE_INFINITY;
          return aTime - bTime;
        }
        case "servings":
          return b.recipe.servings - a.recipe.servings;
        default:
          return b.recipe.updatedAt - a.recipe.updatedAt;
      }
    });

    return matched.map((entry) => entry.recipe);
  }, [recipes, search, activeTags, favoritesOnly, sort]);

  const hasFilters = search.trim() !== "" || activeTags.length > 0 || favoritesOnly;
  const total = recipes?.length ?? 0;

  function clearFilters() {
    setSearch("");
    setActiveTags([]);
    setFavoritesOnly(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Recipe Library</h1>
        <p className="text-[var(--muted-foreground)]">
          Import from any site, paste text, or write your own — everything&apos;s stored privately on this device.
        </p>
      </div>

      <UrlImporter sharedUrl={sharedUrl} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search title, tag, or ingredient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search recipes"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
          >
            ★ Favorites
          </Button>
          <Button asChild size="sm">
            <Link href="/recipes/new">
              <Plus className="h-4 w-4" /> New Recipe
            </Link>
          </Button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {allTags.map(([tag, count]) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setActiveTags((prev) => (active ? prev.filter((t) => t !== tag) : [...prev, tag]))
                }
              >
                <Badge variant={active ? "default" : "secondary"} className={cn("cursor-pointer")}>
                  {tag}
                  <span className="opacity-60">{count}</span>
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {recipes !== undefined && total > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
          <span>
            {filtered.length === total
              ? `${total} recipe${total === 1 ? "" : "s"}`
              : `${filtered.length} of ${total} recipes`}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[var(--primary)] underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {recipes === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
          <ChefHat className="h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="font-medium">{total === 0 ? "Your vault is empty" : "No recipes match"}</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            {total === 0
              ? "Paste a recipe URL above to import your first one, or write it yourself."
              : "Try a different search term, or clear your filters."}
          </p>
          {hasFilters && total > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFavorite={(id) => toggleFavorite(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <RecipesPageInner />
    </Suspense>
  );
}
