"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Star, Users, ChefHat } from "lucide-react";
import type { Recipe } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, formatMinutes } from "@/lib/utils";

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite?: (id: string) => void;
}

export function RecipeCard({ recipe, onToggleFavorite }: RecipeCardProps) {
  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/recipes/${recipe.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
          {recipe.image ? (
            <Image
              src={recipe.image}
              alt={recipe.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ChefHat className="h-10 w-10 text-[var(--muted-foreground)]" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">{recipe.title}</h3>
          {recipe.description && (
            <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{recipe.description}</p>
          )}

          <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatMinutes(recipe.totalTimeMinutes)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings} servings
            </span>
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <Badge variant="outline">+{recipe.tags.length - 3}</Badge>
              )}
            </div>
          )}
        </div>
      </Link>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(recipe.id);
          }}
          aria-label={recipe.favorite ? "Remove from favorites" : "Add to favorites"}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform hover:scale-110"
        >
          <Star className={cn("h-4 w-4", recipe.favorite && "fill-yellow-400 text-yellow-400")} />
        </button>
      )}
    </Card>
  );
}
