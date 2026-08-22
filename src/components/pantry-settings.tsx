"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Plus, RotateCcw, X, Boxes } from "lucide-react";
import { DEFAULT_PANTRY_STAPLES } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/lib/db/client";
import { savePantryStaples } from "@/lib/db/settings";

export function PantrySettings() {
  const [draft, setDraft] = React.useState("");

  const staples = useLiveQuery(async () => {
    const row = await getDb().settings.get("app");
    return row?.pantryStaples ?? DEFAULT_PANTRY_STAPLES;
  }, []);

  const current = staples ?? [];

  async function addStaple(e: React.FormEvent) {
    e.preventDefault();
    const value = draft.trim().toLowerCase();
    if (!value) return;
    if (current.includes(value)) {
      toast.warning(`"${value}" is already a pantry staple.`);
      setDraft("");
      return;
    }
    await savePantryStaples([...current, value]);
    setDraft("");
  }

  async function removeStaple(value: string) {
    await savePantryStaples(current.filter((s) => s !== value));
  }

  async function resetDefaults() {
    await savePantryStaples(DEFAULT_PANTRY_STAPLES);
    toast.success("Pantry staples reset to the defaults.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5" /> Pantry staples
        </CardTitle>
        <CardDescription>
          Things you always have on hand. These are automatically skipped when a grocery list is
          generated, so you stop buying salt every week.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {current.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              No staples yet — everything will be added to your grocery lists.
            </p>
          )}
          {current.map((staple) => (
            <Badge key={staple} variant="secondary" className="gap-1 pr-1">
              {staple}
              <button
                type="button"
                onClick={() => removeStaple(staple)}
                aria-label={`Remove ${staple} from pantry staples`}
                className="rounded-full p-0.5 hover:bg-[var(--card)]"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <form onSubmit={addStaple} className="flex flex-wrap gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. sugar"
            className="w-full sm:max-w-xs"
            aria-label="Add a pantry staple"
          />
          <Button type="submit" size="sm">
            <Plus className="h-4 w-4" /> Add
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
