"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeForm } from "@/components/recipe-form";

export default function NewRecipePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/recipes"
        className="flex w-fit items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Write a Recipe</h1>
        <p className="text-[var(--muted-foreground)]">Create a recipe from scratch, stored only on this device.</p>
      </div>
      <RecipeForm />
    </div>
  );
}
