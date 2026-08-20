"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Loader2, Sparkles, FileText, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScrapedRecipe } from "@/types";
import { RECIPE_TAGS } from "@/types";
import { parsePlainTextRecipe } from "@/lib/parser/plaintext";
import { buildRecipeFromScraped } from "@/lib/db/recipes";
import { saveRecipe } from "@/lib/db/recipes";
import { cn } from "@/lib/utils";

export function UrlImporter() {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [pastedText, setPastedText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<ScrapedRecipe | null>(null);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  async function handleImportUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't import that recipe.");
        return;
      }
      setPreview(data.recipe as ScrapedRecipe);
      setSelectedTags((data.recipe as ScrapedRecipe).tags.filter((t: string) => RECIPE_TAGS.includes(t as never)));
      toast.success("Recipe imported — review it below before saving.");
    } catch {
      toast.error("Network error while importing. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleParseText() {
    if (!pastedText.trim()) return;
    const parsed = parsePlainTextRecipe(pastedText);
    setPreview(parsed);
    setSelectedTags([]);
    toast.success("Text parsed — review it below before saving.");
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      const recipe = buildRecipeFromScraped(preview, selectedTags);
      await saveRecipe(recipe);
      toast.success(`Saved "${recipe.title}" to your vault.`);
      setPreview(null);
      setUrl("");
      setPastedText("");
      router.push(`/recipes/${recipe.id}`);
      router.refresh();
    } catch {
      toast.error("Couldn't save that recipe locally.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <Tabs defaultValue="url">
          <TabsList>
            <TabsTrigger value="url">
              <Link2 className="mr-1.5 h-4 w-4" /> Import via URL
            </TabsTrigger>
            <TabsTrigger value="paste">
              <ClipboardPaste className="mr-1.5 h-4 w-4" /> Paste Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <form onSubmit={handleImportUrl} className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                required
                placeholder="Paste a recipe URL, e.g. https://example.com/best-chili"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Importing…" : "Import Recipe"}
              </Button>
            </form>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              We fetch the page server-side and strip out everything except the structured recipe data —
              no ads, no life stories.
            </p>
          </TabsContent>

          <TabsContent value="paste">
            <div className="flex flex-col gap-2">
              <Textarea
                rows={6}
                placeholder={"Paste recipe text here. If it has \"Ingredients\" and \"Instructions\" headings, we'll detect them automatically."}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <Button type="button" onClick={handleParseText} className="self-start">
                <FileText className="h-4 w-4" /> Parse Text
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {preview && (
          <div className="mt-5 animate-fade-in rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  Preview
                </p>
                <h4 className="text-lg font-semibold">{preview.title}</h4>
                {preview.sourceName && (
                  <p className="text-xs text-[var(--muted-foreground)]">from {preview.sourceName}</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
              <span>{preview.ingredientLines.length} ingredients</span>
              <span>{preview.instructions.length} steps</span>
              <span>{preview.servings} servings</span>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-[var(--muted-foreground)]">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {RECIPE_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSelectedTags((prev) =>
                          active ? prev.filter((t) => t !== tag) : [...prev, tag],
                        )
                      }
                    >
                      <Badge variant={active ? "default" : "outline"} className={cn("cursor-pointer")}>
                        {tag}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save to Vault
              </Button>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
