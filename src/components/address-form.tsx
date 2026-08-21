"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Navigation, Trash2, Upload } from "lucide-react";
import type { SavedAddress } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAddress, saveAddress } from "@/lib/db/settings";

interface AddressFormProps {
  current: SavedAddress | null | undefined;
  compact?: boolean;
  onSaved?: (address: SavedAddress) => void;
}

export function AddressForm({ current, compact = false, onSaved }: AddressFormProps) {
  const [query, setQuery] = React.useState(current?.query || current?.formatted || "");
  const [saving, setSaving] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (current) setQuery(current.query || current.formatted);
  }, [current]);

  async function geocodeAndSave(payload: { query?: string; lat?: number; lng?: number }) {
    setSaving(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't look up that address.");
        return;
      }
      const address = data.address as SavedAddress;
      await saveAddress(address);
      setQuery(address.formatted);
      toast.success("Shopping address saved on this device.");
      onSaved?.(address);
    } catch {
      toast.error("Network error while looking up that address.");
    } finally {
      setSaving(false);
      setLocating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      toast.error("Enter a street address or postal code.");
      return;
    }
    await geocodeAndSave({ query: query.trim() });
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      toast.error("This browser doesn't support location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geocodeAndSave({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        toast.error("Couldn't read your location. You can type the address instead.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = (await file.text()).trim();
      const firstLine = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0 && !l.startsWith("#"));
      if (!firstLine) {
        toast.error("That file didn't contain an address.");
        return;
      }
      setQuery(firstLine);
      await geocodeAndSave({ query: firstLine });
    } catch {
      toast.error("Couldn't read that file.");
    }
  }

  async function handleClear() {
    await clearAddress();
    setQuery("");
    toast.success("Shopping address removed.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        {!compact && <Label htmlFor="address">Street address or postal code</Label>}
        <Input
          id="address"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="123 Queen St W, Toronto, ON M5V 2A4"
          className={compact ? "" : "mt-1.5"}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving || locating}>
          {saving && !locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Save address
        </Button>
        <Button type="button" variant="outline" onClick={handleUseLocation} disabled={saving || locating}>
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          Use my location
        </Button>
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={saving}>
          <Upload className="h-4 w-4" /> Upload
        </Button>
        {current && (
          <Button type="button" variant="ghost" onClick={handleClear}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,.vcf,text/plain"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {current && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Shopping near <span className="font-medium text-[var(--foreground)]">{current.formatted}</span>
          {current.postalCode ? ` · ${current.postalCode}` : ""}
        </p>
      )}
    </form>
  );
}
