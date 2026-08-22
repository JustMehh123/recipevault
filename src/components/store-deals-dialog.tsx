"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink, Loader2, MapPin, Package, Store } from "lucide-react";
import type { GroceryDeal, GroceryItem } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/components/address-form";
import { getDb } from "@/lib/db/client";
import { formatDistance } from "@/lib/shopping/geo";
import { detectRegion } from "@/lib/shopping/region";
import { storeMapsUrl } from "@/lib/shopping/chains";
import { formatQuantity } from "@/lib/parser/ingredients";
import { toBaseAmount } from "@/lib/parser/units";
import {
  bestPackIndex,
  getPackageOptions,
  packsNeeded,
  unitPriceLabel,
  type PackageOption,
} from "@/lib/shopping/packages";
import { cn } from "@/lib/utils";

interface StoreDealsDialogProps {
  item: GroceryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreDealsDialog({ item, open, onOpenChange }: StoreDealsDialogProps) {
  const address = useLiveQuery(async () => {
    const row = await getDb().settings.get("app");
    return row?.address ?? null;
  }, []);

  const [deals, setDeals] = React.useState<GroceryDeal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedPack, setSelectedPack] = React.useState<PackageOption | null>(null);

  const query = item?.name ?? "";

  const region = detectRegion({
    country: address?.country,
    countryCode: address?.countryCode,
    postalCode: address?.postalCode,
  });
  const currency = region === "ca" ? "C$" : "$";

  // Retail package sizes this ingredient is actually sold in.
  const packOptions = React.useMemo(
    () => (item ? getPackageOptions(item.name, item.unit, region) : []),
    [item, region],
  );

  // How much the recipes actually call for, in base units (ml/g) or a count.
  const requiredBase = React.useMemo(
    () => (item && item.quantity !== null ? toBaseAmount(item.quantity, item.unit) : null),
    [item],
  );
  const requiredCount = React.useMemo(
    () => (item && item.quantity !== null && !item.unit ? item.quantity : null),
    [item],
  );

  // Preselect the smallest package that covers the requirement.
  React.useEffect(() => {
    if (!open || packOptions.length === 0) {
      setSelectedPack(null);
      return;
    }
    setSelectedPack(packOptions[bestPackIndex(requiredBase, requiredCount, packOptions)]);
  }, [open, packOptions, requiredBase, requiredCount]);

  // Searching for "milk 2 l" finds an actual product, not an abstract amount.
  const searchTerm = React.useMemo(() => {
    if (!item) return "";
    if (!selectedPack || selectedPack.kind === "count") return item.name;
    return `${item.name} ${selectedPack.label}`;
  }, [item, selectedPack]);

  React.useEffect(() => {
    if (!open || !item || !address || !searchTerm) {
      setDeals([]);
      setError(null);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setDeals([]);
      setError("Store prices need a connection. Your grocery list itself works offline.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/grocery-deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchTerm,
        postalCode: address.postalCode,
        lat: address.lat,
        lng: address.lng,
        country: address.country,
        countryCode: address.countryCode,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't load prices.");
        if (!cancelled) setDeals(data.deals as GroceryDeal[]);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load prices.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, item, address, searchTerm]);

  const recipeAmount =
    item && item.quantity !== null
      ? `${formatQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`
      : null;

  const needCount = selectedPack ? packsNeeded(requiredBase, requiredCount, selectedPack) : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buy {query || "this item"}</DialogTitle>
          <DialogDescription>
            {recipeAmount
              ? `Your recipes need ${recipeAmount} — but shops sell packages. Pick a size below.`
              : "Pick the package size you want, then tap a price to open that store's website."}
          </DialogDescription>
        </DialogHeader>

        {address === undefined ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your address…
          </div>
        ) : !address ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Save your address once so we can find grocery stores around you.
            </p>
            <AddressForm current={null} compact />
          </div>
        ) : (
          <>
            {packOptions.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  <Package className="h-3.5 w-3.5" /> Package size
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {packOptions.map((option) => {
                    const active = selectedPack?.id === option.id;
                    const packs = packsNeeded(requiredBase, requiredCount, option);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedPack(option)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]"
                            : "border-[var(--border)] hover:border-[var(--primary)]",
                        )}
                      >
                        {option.label}
                        {packs > 1 && (
                          <span className={cn("ml-1", active ? "opacity-80" : "text-[var(--muted-foreground)]")}>
                            ×{packs}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedPack && (
                  <p className="mt-2 rounded-lg bg-[var(--muted)]/60 px-2.5 py-1.5 text-xs text-[var(--muted-foreground)]">
                    Buy <span className="font-medium text-[var(--foreground)]">
                      {needCount} × {selectedPack.label}
                    </span>
                    {recipeAmount ? ` to cover the ${recipeAmount} your recipes need.` : "."}
                  </p>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Finding {selectedPack?.label ?? ""} prices…
              </div>
            ) : error ? (
              <p className="py-6 text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : deals.length === 0 ? (
              <p className="py-6 text-sm text-[var(--muted-foreground)]">
                No nearby prices turned up for &ldquo;{searchTerm}&rdquo;. Try a different package
                size, or a simpler name.
              </p>
            ) : (
              <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                {deals.map((deal) => {
                  const perUnit = unitPriceLabel(deal.price, selectedPack, currency);
                  return (
                    <li
                      key={deal.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--card)]">
                        <Store className="h-4 w-4 text-[var(--muted-foreground)]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{deal.storeName}</p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">{deal.itemName}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          {deal.distanceMiles != null ? (
                            <>
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {formatDistance(deal.distanceMiles, region)}
                                {deal.address ? ` · ${deal.address}` : ""}
                              </span>
                            </>
                          ) : (
                            <span className="truncate">{deal.saleStory}</span>
                          )}
                        </p>
                        {deal.distanceMiles != null && (
                          <a
                            href={storeMapsUrl(deal.storeName, deal.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block text-[11px] text-[var(--primary)] hover:underline"
                          >
                            Directions
                          </a>
                        )}
                      </div>
                      <a
                        href={deal.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-[6rem] flex-col items-end rounded-lg px-2 py-1 text-right transition-colors hover:bg-[var(--card)]"
                        title={`Buy at ${deal.storeName}`}
                      >
                        <span className="flex items-center gap-1 text-base font-semibold text-[var(--primary)]">
                          {deal.priceLabel}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                        {deal.originalPrice != null &&
                          deal.price != null &&
                          deal.originalPrice > deal.price && (
                            <span className="text-xs text-[var(--muted-foreground)] line-through">
                              {currency}
                              {deal.originalPrice.toFixed(2)}
                            </span>
                          )}
                        {perUnit && (
                          <span className="text-[10px] text-[var(--muted-foreground)]">{perUnit}</span>
                        )}
                        {needCount > 1 && deal.price != null && (
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {currency}
                            {(deal.price * needCount).toFixed(2)} for {needCount}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
