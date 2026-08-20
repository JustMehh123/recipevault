"use client";

import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChefHat, BookMarked, CalendarDays, ShoppingCart, Link2, ShieldCheck, WifiOff, Smartphone } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { seedSampleRecipesIfEmpty } from "@/lib/db/recipes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWeekStart } from "@/lib/utils";

export default function HomePage() {
  React.useEffect(() => {
    seedSampleRecipesIfEmpty().catch(() => undefined);
  }, []);

  const recipeCount = useLiveQuery(async () => getDb().recipes.count(), [], undefined);
  const weekStart = getWeekStart();
  const plannedCount = useLiveQuery(
    async () => getDb().mealPlanEntries.where("weekStart").equals(weekStart).count(),
    [weekStart],
    undefined,
  );
  const groceryLists = useLiveQuery(async () => getDb().groceryLists.toArray(), [], []);
  const pendingItems = React.useMemo(
    () => (groceryLists ?? []).reduce((sum, list) => sum + list.items.filter((i) => !i.checked).length, 0),
    [groceryLists],
  );

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-start gap-5 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--muted)] p-8 sm:p-12">
        <span className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--primary-foreground)]">
          <ChefHat className="h-3.5 w-3.5" /> RecipeVault
        </span>
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          The ad-free, local-first way to organize your recipes.
        </h1>
        <p className="max-w-xl text-base text-[var(--muted-foreground)] sm:text-lg">
          Import recipes from any website, plan your week, and generate a smart grocery list —
          everything stays private, stored only in your browser.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/recipes">
              <Link2 className="h-4 w-4" /> Import Your First Recipe
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/planner">Plan This Week</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-4 pt-2 text-sm text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> 100% private — no accounts, no tracking
          </span>
          <span className="flex items-center gap-1.5">
            <WifiOff className="h-4 w-4" /> Works fully offline
          </span>
          <span className="flex items-center gap-1.5">
            <Smartphone className="h-4 w-4" /> Installable as an app
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<BookMarked className="h-5 w-5" />}
          label="Recipes saved"
          value={recipeCount ?? "—"}
          href="/recipes"
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Meals planned this week"
          value={plannedCount ?? "—"}
          href="/planner"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Items left to buy"
          value={pendingItems}
          href="/grocery"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FeatureCard
          icon={<Link2 className="h-6 w-6" />}
          title="One-click import"
          description="Paste any recipe URL and we'll strip out the ads and life stories, keeping just the ingredients and steps."
        />
        <FeatureCard
          icon={<CalendarDays className="h-6 w-6" />}
          title="Drag-and-drop planning"
          description="Build a Monday-to-Sunday meal plan by dragging recipes onto breakfast, lunch, or dinner slots."
        />
        <FeatureCard
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Smart grocery lists"
          description="We merge duplicate ingredients across recipes and sort everything by grocery aisle automatically."
        />
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)]">
              <Smartphone className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Use it like a real app</h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--muted-foreground)]">
                Install RecipeVault on your phone or laptop. It opens full-screen, works offline,
                and keeps every recipe private on this device. No App Store, no account.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/settings">Install &amp; backup</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--foreground)]">
            {icon}
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
          {icon}
        </span>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
      </CardContent>
    </Card>
  );
}
