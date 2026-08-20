"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, Trash2 } from "lucide-react";
import type { Recipe } from "@/types";
import { RECIPE_TAGS } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveRecipe, deleteRecipe } from "@/lib/db/recipes";
import { parseIngredientLines, displayIngredient } from "@/lib/parser/ingredients";
import { generateId, cn } from "@/lib/utils";

interface RecipeFormProps {
  initialRecipe?: Recipe;
}

export function RecipeForm({ initialRecipe }: RecipeFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialRecipe);

  const [title, setTitle] = React.useState(initialRecipe?.title ?? "");
  const [description, setDescription] = React.useState(initialRecipe?.description ?? "");
  const [image, setImage] = React.useState(initialRecipe?.image ?? "");
  const [sourceUrl, setSourceUrl] = React.useState(initialRecipe?.sourceUrl ?? "");
  const [servings, setServings] = React.useState(initialRecipe?.servings ?? 4);
  const [prepTime, setPrepTime] = React.useState(initialRecipe?.prepTimeMinutes ?? "");
  const [cookTime, setCookTime] = React.useState(initialRecipe?.cookTimeMinutes ?? "");
  const [cuisine, setCuisine] = React.useState(initialRecipe?.cuisine ?? "");
  const [notes, setNotes] = React.useState(initialRecipe?.notes ?? "");
  const [ingredientsText, setIngredientsText] = React.useState(
    initialRecipe ? initialRecipe.ingredients.map(displayIngredient).join("\n") : "",
  );
  const [instructionsText, setInstructionsText] = React.useState(
    initialRecipe ? initialRecipe.instructions.join("\n") : "",
  );
  const [tags, setTags] = React.useState<string[]>(initialRecipe?.tags ?? []);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give your recipe a title first.");
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      const ingredientLines = ingredientsText.split("\n").map((l) => l.trim()).filter(Boolean);
      const instructionLines = instructionsText.split("\n").map((l) => l.trim()).filter(Boolean);
      const prepMinutes = prepTime === "" ? null : Number(prepTime);
      const cookMinutes = cookTime === "" ? null : Number(cookTime);
      const totalMinutes =
        prepMinutes !== null || cookMinutes !== null ? (prepMinutes ?? 0) + (cookMinutes ?? 0) : null;

      const recipe: Recipe = {
        id: initialRecipe?.id ?? generateId(),
        title: title.trim(),
        description: description.trim(),
        image: image.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        sourceName: initialRecipe?.sourceName ?? null,
        prepTimeMinutes: prepMinutes,
        cookTimeMinutes: cookMinutes,
        totalTimeMinutes: initialRecipe?.totalTimeMinutes && prepMinutes === initialRecipe.prepTimeMinutes && cookMinutes === initialRecipe.cookTimeMinutes
          ? initialRecipe.totalTimeMinutes
          : totalMinutes,
        servings: Number(servings) || 1,
        ingredients: parseIngredientLines(ingredientLines),
        instructions: instructionLines,
        tags,
        cuisine: cuisine.trim() || null,
        notes: notes.trim(),
        favorite: initialRecipe?.favorite ?? false,
        createdAt: initialRecipe?.createdAt ?? now,
        updatedAt: now,
      };

      await saveRecipe(recipe);
      toast.success(isEdit ? "Recipe updated." : "Recipe saved to your vault.");
      router.push(`/recipes/${recipe.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong saving that recipe.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialRecipe) return;
    if (!confirm(`Delete "${initialRecipe.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteRecipe(initialRecipe.id);
      toast.success("Recipe deleted.");
      router.push("/recipes");
      router.refresh();
    } catch {
      toast.error("Couldn't delete that recipe.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="image">Image URL</Label>
          <Input id="image" value={image ?? ""} onChange={(e) => setImage(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input
            id="sourceUrl"
            value={sourceUrl ?? ""}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="cuisine">Cuisine</Label>
          <Input id="cuisine" value={cuisine ?? ""} onChange={(e) => setCuisine(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="prepTime">Prep time (minutes)</Label>
          <Input
            id="prepTime"
            type="number"
            min={0}
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="cookTime">Cook time (minutes)</Label>
          <Input
            id="cookTime"
            type="number"
            min={0}
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label>Tags</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {RECIPE_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => setTags((prev) => (active ? prev.filter((t) => t !== tag) : [...prev, tag]))}
              >
                <Badge variant={active ? "default" : "outline"} className={cn("cursor-pointer")}>
                  {tag}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="ingredients">Ingredients (one per line)</Label>
        <Textarea
          id="ingredients"
          rows={8}
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder={"2 cups flour\n1 tsp salt\n3 eggs"}
          className="mt-1.5 font-mono text-sm"
        />
      </div>

      <div>
        <Label htmlFor="instructions">Instructions (one step per line)</Label>
        <Textarea
          id="instructions"
          rows={8}
          value={instructionsText}
          onChange={(e) => setInstructionsText(e.target.value)}
          placeholder={"Preheat oven to 350°F.\nMix dry ingredients.\nBake for 25 minutes."}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div>
          {isEdit && (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Recipe
            </Button>
          )}
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save Changes" : "Save Recipe"}
        </Button>
      </div>
    </form>
  );
}
