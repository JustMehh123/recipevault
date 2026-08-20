"use client";

import * as React from "react";
import { Trash2, PackagePlus } from "lucide-react";
import type { GroceryCategory, GroceryList } from "@/types";
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
  const [addOpen, setAddOpen] = React.useState(false);
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen((v) => !v)}>
            <PackagePlus className="h-4 w-4" /> Add Item
          </Button>
          {checkedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearCheckedItems(list.id)}>
              <Trash2 className="h-4 w-4" /> Clear checked
            </Button>
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
                      />
                      <button
                        type="button"
                        onClick={() => toggleGroceryItem(list.id, item.id)}
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
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGroceryItem(list.id, item.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4 text-[var(--muted-foreground)] hover:text-red-500" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
