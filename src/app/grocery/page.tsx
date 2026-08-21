"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ShoppingCart, Trash2, PlusCircle, MapPin } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { deleteGroceryList, generateGroceryListFromWeek } from "@/lib/db/grocery";
import { GroceryChecklist } from "@/components/grocery-checklist";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getWeekStart, formatWeekRange } from "@/lib/utils";

function GroceryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listParam = searchParams.get("list");

  const lists = useLiveQuery(async () => {
    const db = getDb();
    return db.groceryLists.orderBy("createdAt").reverse().toArray();
  }, [], []);

  const [selectedId, setSelectedId] = React.useState<string | null>(listParam);
  const [generating, setGenerating] = React.useState(false);
  const savedAddress = useLiveQuery(async () => {
    const row = await getDb().settings.get("app");
    return row?.address ?? null;
  }, []);

  React.useEffect(() => {
    if (listParam) {
      setSelectedId(listParam);
    } else if (lists && lists.length > 0 && !selectedId) {
      setSelectedId(lists[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listParam, lists]);

  const activeList = useLiveQuery(async () => {
    if (!selectedId) return undefined;
    const db = getDb();
    return db.groceryLists.get(selectedId);
  }, [selectedId]);

  async function handleGenerateThisWeek() {
    setGenerating(true);
    try {
      const list = await generateGroceryListFromWeek(getWeekStart());
      setSelectedId(list.id);
      router.replace(`/grocery?list=${list.id}`);
      if (list.items.length === 0) {
        toast.warning("This week's plan is empty — add meals in the planner first.");
      } else {
        toast.success(`Generated a grocery list with ${list.items.length} items.`);
      }
    } catch {
      toast.error("Couldn't generate a grocery list.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this grocery list?")) return;
    await deleteGroceryList(id);
    if (selectedId === id) {
      setSelectedId(null);
      router.replace("/grocery");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Smart Grocery List</h1>
        <p className="text-[var(--muted-foreground)]">
          Auto-generated from your weekly plan, with duplicate ingredients merged and grouped by aisle.
          Tap an item to compare nearby store prices.
        </p>
      </div>

      {savedAddress ? (
        <p className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Shopping near {savedAddress.formatted}.{" "}
            <Link href="/settings" className="text-[var(--primary)] hover:underline">
              Change address
            </Link>
          </span>
        </p>
      ) : savedAddress === null ? (
        <p className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
          <span>
            Add your address in{" "}
            <Link href="/settings" className="font-medium text-[var(--primary)] hover:underline">
              Settings
            </Link>{" "}
            so tapping a grocery item can show stores near you and their prices.
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleGenerateThisWeek} disabled={generating}>
          <ShoppingCart className="h-4 w-4" /> Generate List from Week ({formatWeekRange(getWeekStart())})
        </Button>

        {lists && lists.length > 0 && (
          <Select value={selectedId ?? undefined} onValueChange={(v) => { setSelectedId(v); router.replace(`/grocery?list=${v}`); }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a saved list" />
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activeList && (
          <Button variant="ghost" size="sm" onClick={() => handleDelete(activeList.id)}>
            <Trash2 className="h-4 w-4" /> Delete list
          </Button>
        )}
      </div>

      {lists === undefined ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">Loading…</p>
      ) : !activeList ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
          <PlusCircle className="h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="font-medium">No grocery list yet</p>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Plan some meals for the week, then generate a categorized shopping list in one click.
          </p>
        </div>
      ) : (
        <GroceryChecklist list={activeList} />
      )}
    </div>
  );
}

export default function GroceryPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-[var(--muted-foreground)]">Loading…</p>}>
      <GroceryPageInner />
    </Suspense>
  );
}
