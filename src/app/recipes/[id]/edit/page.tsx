"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ChefHat } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { RecipeForm } from "@/components/recipe-form";
import { Button } from "@/components/ui/button";

export default function EditRecipePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const recipe = useLiveQuery(async () => {
    const db = getDb();
    return db.recipes.get(id);
  }, [id]);

  if (recipe === undefined) {
    return <div className="py-20 text-center text-[var(--muted-foreground)]">Loading recipe…</div>;
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ChefHat className="h-10 w-10 text-[var(--muted-foreground)]" />
        <p className="font-medium">Recipe not found</p>
        <Button asChild variant="outline">
          <Link href="/recipes">Back to library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/recipes/${recipe.id}`}
        className="flex w-fit items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to recipe
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Edit Recipe</h1>
      </div>
      <RecipeForm initialRecipe={recipe} />
    </div>
  );
}
