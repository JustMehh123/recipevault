"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink, Loader2, MapPin, Store } from "lucide-react";
import type { GroceryDeal, GroceryItem } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/components/address-form";
import { getDb } from "@/lib/db/client";
import { formatDistance } from "@/lib/shopping/geo";
import { detectRegion } from "@/lib/shopping/region";
import { formatQuantity } from "@/lib/parser/ingredients";

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

  const query = item?.name ?? "";

  React.useEffect(() => {
    if (!open || !item || !address) {
      setDeals([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/grocery-deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: item.name,
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
  }, [open, item, address]);

  const qtyLabel =
    item && item.quantity !== null
      ? `${formatQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`
      : null;

  const region = detectRegion({
    country: address?.country,
    countryCode: address?.countryCode,
    postalCode: address?.postalCode,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buy {query || "this item"}</DialogTitle>
          <DialogDescription>
            {qtyLabel ? `You need ${qtyLabel}. ` : ""}
            Nearby stores and current flyer prices — tap a price to open that store&apos;s website.
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
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Finding stores and prices…
          </div>
        ) : error ? (
          <p className="py-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : deals.length === 0 ? (
          <p className="py-6 text-sm text-[var(--muted-foreground)]">
            No nearby prices turned up for &ldquo;{query}&rdquo;. Try a simpler name (e.g. &ldquo;milk&rdquo; instead of
            a brand).
          </p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
            {deals.map((deal) => (
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
                    {deal.distanceMiles != null && (
                      <>
                        <MapPin className="h-3 w-3" />
                        {formatDistance(deal.distanceMiles, region)}
                        {deal.address ? ` · ${deal.address}` : ""}
                      </>
                    )}
                    {deal.distanceMiles == null && deal.saleStory}
                  </p>
                </div>
                <a
                  href={deal.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-[5.5rem] flex-col items-end rounded-lg px-2 py-1 text-right transition-colors hover:bg-[var(--card)]"
                  title={`Buy at ${deal.storeName}`}
                >
                  <span className="flex items-center gap-1 text-base font-semibold text-[var(--primary)]">
                    {deal.priceLabel}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                  {deal.originalPrice != null && deal.price != null && deal.originalPrice > deal.price && (
                    <span className="text-xs text-[var(--muted-foreground)] line-through">
                      ${deal.originalPrice.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                    {deal.source === "nearby" ? "search store" : "open site"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
