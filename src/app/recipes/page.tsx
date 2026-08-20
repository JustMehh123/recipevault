"use client";

import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search, ChefHat } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { seedSampleRecipesIfEmpty, toggleFavorite } from "@/lib/db/recipes";
import { UrlImporter } from "@/components/url-importer";
import { RecipeCard } from "@/components/recipe-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RecipesPage() {
  const [search, setSearch] = React.useState("");
  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);

  React.useEffect(() => {
    seedSampleRecipesIfEmpty().catch(() => undefined);
  }, []);

  const recipes = useLiveQuery(async () => {
    const db = getDb();
    return db.recipes.orderBy("updatedAt").reverse().toArray();
  }, [], []);

  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    (recipes ?? []).forEach((r) => r.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [recipes]);

  const filtered = React.useMemo(() => {
    if (!recipes) return [];
    const query = search.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (favoritesOnly && !recipe.favorite) return false;
      if (activeTags.length > 0 && !activeTags.every((t) => recipe.tags.includes(t))) return false;
      if (!query) return true;
      const haystack = `${recipe.title} ${recipe.description} ${recipe.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [recipes, search, activeTags, favoritesOnly]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Recipe Library</h1>
        <p className="text-[var(--muted-foreground)]">
          Import from any site, paste text, or write your own — everything&apos;s stored privately on this device.
        </p>
      </div>

      <UrlImporter />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search recipes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesOnly((v) => !v)}
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
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setActiveTags((prev) => (active ? prev.filter((t) => t !== tag) : [...prev, tag]))
                }
              >
                <Badge variant={active ? "default" : "secondary"} className={cn("cursor-pointer")}>
                  {tag}
                </Badge>
              </button>
            );
          })}
          {activeTags.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTags([])}
              className="text-xs text-[var(--muted-foreground)] underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {recipes === undefined ? (
        <div className="py-20 text-center text-[var(--muted-foreground)]">Loading your vault…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
          <ChefHat className="h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="font-medium">No recipes match yet</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Try importing a recipe from a URL above, or adjust your search and filters.
          </p>
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
