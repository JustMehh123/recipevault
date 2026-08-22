"use client";

import * as React from "react";
import { Trash2, PackagePlus, Tag, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/client";
import type { GroceryCategory, GroceryItem, GroceryList } from "@/types";
import { GROCERY_CATEGORIES } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatQuantity } from "@/lib/parser/ingredients";
import { cn } from "@/lib/utils";
import {
  addManualGroceryItem,
  clearCheckedItems,
  removeGroceryItem,
  toggleGroceryItem,
} from "@/lib/db/grocery";
import { StoreDealsDialog } from "@/components/store-deals-dialog";
import { detectRegion } from "@/lib/shopping/region";
import { bestPackIndex, getPackageOptions, packsNeeded } from "@/lib/shopping/packages";
import { toBaseAmount } from "@/lib/parser/units";

const CATEGORY_ICONS: Record<GroceryCategory, string> = {
  Produce: "🥦",
  "Meat & Seafood": "🍗",
  "Dairy & Eggs": "🥛",
  Bakery: "🍞",
  Pantry: "🥫",
  Frozen: "🧊",
  "Spices & Condiments": "🧂",
  Beverages: "🥤",
  Other: "🛒",
};

export function GroceryChecklist({ list }: { list: GroceryList }) {
  // Resolve recipe titles so each line can show what it's for.
  const address = useLiveQuery(async () => {
    const row = await getDb().settings.get("app");
    return row?.address ?? null;
  }, []);

  const region = detectRegion({
    country: address?.country,
    countryCode: address?.countryCode,
    postalCode: address?.postalCode,
  });

  const recipeTitles = useLiveQuery(async () => {
    const ids = Array.from(new Set(list.items.flatMap((i) => i.sourceRecipeIds)));
    if (ids.length === 0) return new Map<string, string>();
    const recipes = await getDb().recipes.bulkGet(ids);
    const map = new Map<string, string>();
    recipes.forEach((r) => {
      if (r) map.set(r.id, r.title);
    });
    return map;
  }, [list]);

  const [addOpen, setAddOpen] = React.useState(false);
  const [dealItem, setDealItem] = React.useState<GroceryItem | null>(null);
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [category, setCategory] = React.useState<GroceryCategory>("Other");

  const grouped = React.useMemo(() => {
    const map = new Map<GroceryCategory, typeof list.items>();
    GROCERY_CATEGORIES.forEach((c) => map.set(c, []));
    list.items.forEach((item) => {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    });
    return map;
  }, [list]);

  const checkedCount = list.items.filter((i) => i.checked).length;
  const total = list.items.length;
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  /** Builds a plain-text version of the list, grouped by aisle, for sharing. */
  function buildShareText(): string {
    const sections: string[] = [`${list.name}`, ""];
    for (const cat of GROCERY_CATEGORIES) {
      const items = (grouped.get(cat) ?? []).filter((i) => !i.checked);
      if (items.length === 0) continue;
      sections.push(`${CATEGORY_ICONS[cat]} ${cat}`);
      for (const item of items) {
        const qty = item.quantity !== null ? `${formatQuantity(item.quantity)} ` : "";
        const unit = item.unit ? `${item.unit} ` : "";
        sections.push(`  - ${qty}${unit}${item.name}`);
      }
      sections.push("");
    }
    return sections.join("\n").trim();
  }

  async function handleShareList() {
    const text = buildShareText();
    if (!text) {
      toast.warning("Everything is already checked off.");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: list.name, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Grocery list copied to the clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Grocery list copied to the clipboard.");
      } catch {
        toast.error("Couldn't share this list.");
      }
    }
  }

  async function handleUncheckAll() {
    await Promise.all(
      list.items.filter((i) => i.checked).map((i) => toggleGroceryItem(list.id, i.id)),
    );
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await addManualGroceryItem(list.id, {
      name: name.trim(),
      quantity: quantity.trim() ? Number(quantity) : null,
      unit: unit.trim() || null,
      category,
    });
    setName("");
    setQuantity("");
    setUnit("");
    setCategory("Other");
    setAddOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">
              {checkedCount} of {total} collected
            </span>
            <span className="text-[var(--muted-foreground)]">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen((v) => !v)}>
            <PackagePlus className="h-4 w-4" /> Add Item
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareList} disabled={total === 0}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          {checkedCount > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={handleUncheckAll}>
                Uncheck all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clearCheckedItems(list.id)}>
                <Trash2 className="h-4 w-4" /> Clear checked
              </Button>
            </>
          )}
        </div>
      </div>

      {addOpen && (
        <form
          onSubmit={handleAddManual}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3"
        >
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-medium">Item</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paper towels" />
          </div>
          <div className="w-20">
            <label className="mb-1 block text-xs font-medium">Qty</label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={0} />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium">Unit</label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pack" />
          </div>
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium">Aisle</label>
            <Select value={category} onValueChange={(v) => setCategory(v as GroceryCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROCERY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_ICONS[c]} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
      )}

      {total === 0 ? (
        <p className="py-16 text-center text-[var(--muted-foreground)]">
          This list is empty. Generate one from your weekly plan or add items manually.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {GROCERY_CATEGORIES.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)]">
                  <span>{CATEGORY_ICONS[cat]}</span> {cat}
                  <span className="font-normal">({items.length})</span>
                </h3>
                <ul className="flex flex-col gap-1">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleGroceryItem(list.id, item.id)}
                        aria-label={`Mark ${item.name} as collected`}
                      />
                      <button
                        type="button"
                        onClick={() => setDealItem(item)}
                        className={cn(
                          "flex-1 text-left text-sm",
                          item.checked && "text-[var(--muted-foreground)] line-through",
                        )}
                      >
                        {item.quantity !== null && (
                          <span className="font-medium">{formatQuantity(item.quantity)} </span>
                        )}
                        {item.unit && <span className="font-medium">{item.unit} </span>}
                        {item.name}
                        {item.notes && <span className="text-[var(--muted-foreground)]"> · {item.notes}</span>}
                        {(() => {
                          const titles = item.sourceRecipeIds
                            .map((id) => recipeTitles?.get(id))
                            .filter(Boolean) as string[];
                          if (titles.length === 0) return null;
                          return (
                            <span className="mt-0.5 block truncate text-[11px] text-[var(--muted-foreground)]">
                              for {titles.join(", ")}
                            </span>
                          );
                        })()}
                        <span className="mt-0.5 block text-[11px] font-medium text-[var(--primary)] no-underline">
                          {(() => {
                            const options = getPackageOptions(item.name, item.unit, region);
                            if (options.length === 0) return "Compare nearby prices";
                            const base =
                              item.quantity !== null ? toBaseAmount(item.quantity, item.unit) : null;
                            const count =
                              item.quantity !== null && !item.unit ? item.quantity : null;
                            const pack = options[bestPackIndex(base, count, options)];
                            const packs = packsNeeded(base, count, pack);
                            return `Buy ${packs} × ${pack.label} · compare prices`;
                          })()}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDealItem(item)}
                        className="rounded-lg p-2 text-[var(--primary)] hover:bg-[var(--muted)]"
                        aria-label={`Find prices for ${item.name}`}
                        title="Find nearby prices"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGroceryItem(list.id, item.id)}
                        className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-red-500"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <StoreDealsDialog item={dealItem} open={dealItem !== null} onOpenChange={(open) => !open && setDealItem(null)} />
    </div>
  );
}
