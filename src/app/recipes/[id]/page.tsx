"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  ChefHat,
  Clock,
  Users,
  Minus,
  Plus,
  PlayCircle,
  CalendarPlus,
  Star,
  Globe,
  Printer,
  Share2,
} from "lucide-react";
import { getDb } from "@/lib/db/client";
import { toggleFavorite } from "@/lib/db/recipes";
import { addMealPlanEntry } from "@/lib/db/mealPlan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CookModeModal } from "@/components/cook-mode-modal";
import { scaleIngredients, displayIngredient } from "@/lib/parser/ingredients";
import { formatMinutes, getWeekStart } from "@/lib/utils";
import { DAY_NAMES, MEAL_TYPES, type DayIndex, type MealType } from "@/types";

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const recipe = useLiveQuery(async () => {
    const db = getDb();
    return db.recipes.get(id);
  }, [id]);

  const [servings, setServings] = React.useState<number | null>(null);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [cookModeOpen, setCookModeOpen] = React.useState(false);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [planDay, setPlanDay] = React.useState<DayIndex>(0);
  const [planMeal, setPlanMeal] = React.useState<MealType>("dinner");

  React.useEffect(() => {
    if (recipe && servings === null) setServings(recipe.servings);
  }, [recipe, servings]);

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

  const effectiveServings = servings ?? recipe.servings;
  const factor = recipe.servings > 0 ? effectiveServings / recipe.servings : 1;
  const scaledIngredients = scaleIngredients(recipe.ingredients, factor);

  async function handleAddToPlan() {
    await addMealPlanEntry({
      weekStart: getWeekStart(),
      day: planDay,
      mealType: planMeal,
      recipeId: recipe!.id,
      servings: effectiveServings,
    });
    toast.success(`Added "${recipe!.title}" to this week's ${planMeal} on ${DAY_NAMES[planDay]}.`);
    setPlanOpen(false);
  }

  async function handleShare() {
    const text = [
      recipe!.title,
      recipe!.description,
      "",
      "Ingredients:",
      ...scaledIngredients.map((ing) => `• ${displayIngredient(ing)}`),
      "",
      "Instructions:",
      ...recipe!.instructions.map((step, i) => `${i + 1}. ${step}`),
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: recipe!.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Recipe copied to the clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Recipe copied to the clipboard.");
      } catch {
        toast.error("Couldn't share this recipe.");
      }
    }
  }

  return (
    <div className="print-area mx-auto flex max-w-4xl flex-col gap-6">
      <div className="no-print flex items-center justify-between">
        <Link
          href="/recipes"
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => window.print()} title="Print recipe">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} title="Share recipe">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => toggleFavorite(recipe.id)}>
            <Star className={recipe.favorite ? "h-4 w-4 fill-yellow-400 text-yellow-400" : "h-4 w-4"} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => router.push(`/recipes/${recipe.id}/edit`)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {recipe.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[var(--muted)]">
          <Image src={recipe.image} alt={recipe.title} fill unoptimized className="object-cover" />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{recipe.title}</h1>
        {recipe.description && <p className="mt-2 text-[var(--muted-foreground)]">{recipe.description}</p>}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
          >
            <Globe className="h-3.5 w-3.5" /> View original at {recipe.sourceName ?? "source"}
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {recipe.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {recipe.cuisine && <Badge variant="outline">{recipe.cuisine}</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaStat icon={<Clock className="h-4 w-4" />} label="Prep" value={formatMinutes(recipe.prepTimeMinutes)} />
        <MetaStat icon={<Clock className="h-4 w-4" />} label="Cook" value={formatMinutes(recipe.cookTimeMinutes)} />
        <MetaStat icon={<Clock className="h-4 w-4" />} label="Total" value={formatMinutes(recipe.totalTimeMinutes)} />
        <MetaStat icon={<Users className="h-4 w-4" />} label="Servings" value={String(recipe.servings)} />
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <Button onClick={() => setCookModeOpen(true)}>
          <PlayCircle className="h-4 w-4" /> Start Cook Mode
        </Button>
        <Button variant="outline" onClick={() => setPlanOpen(true)}>
          <CalendarPlus className="h-4 w-4" /> Add to This Week&apos;s Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <div className="flex items-center gap-2 rounded-lg bg-[var(--muted)] px-2 py-1">
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(1, (s ?? recipe.servings) - 1))}
                className="rounded-md p-1 hover:bg-[var(--card)]"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{effectiveServings}</span>
              <button
                type="button"
                onClick={() => setServings((s) => (s ?? recipe.servings) + 1)}
                className="rounded-md p-1 hover:bg-[var(--card)]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <ul className="flex flex-col gap-1">
            {scaledIngredients.map((ingredient) => {
              const isChecked = checked.has(ingredient.id);
              return (
                <li key={ingredient.id}>
                  <label
                    className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--muted)]"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(ingredient.id)) next.delete(ingredient.id);
                          else next.add(ingredient.id);
                          return next;
                        })
                      }
                      className="mt-0.5"
                    />
                    <span className={isChecked ? "text-[var(--muted-foreground)] line-through" : ""}>
                      {displayIngredient(ingredient)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Instructions</h2>
          <ol className="flex flex-col gap-4">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-sm font-semibold">
                  {i + 1}
                </span>
                <p className="pt-0.5 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>

          {recipe.notes && (
            <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-4">
              <p className="mb-1 text-sm font-semibold">Notes</p>
              <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-line">{recipe.notes}</p>
            </div>
          )}
        </section>
      </div>

      <CookModeModal recipe={recipe} open={cookModeOpen} onOpenChange={setCookModeOpen} />

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to this week&apos;s plan</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">Day</p>
              <Select value={String(planDay)} onValueChange={(v) => setPlanDay(Number(v) as DayIndex)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((day, i) => (
                    <SelectItem key={day} value={String(i)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Meal</p>
              <Select value={planMeal} onValueChange={(v) => setPlanMeal(v as MealType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((meal) => (
                    <SelectItem key={meal} value={meal}>
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddToPlan}>Add to Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] py-3 text-center">
      <span className="text-[var(--muted-foreground)]">{icon}</span>
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}
