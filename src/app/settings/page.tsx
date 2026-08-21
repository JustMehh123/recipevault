"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  DatabaseBackup,
  Loader2,
  BookMarked,
  CalendarDays,
  ShoppingCart,
  MapPin,
} from "lucide-react";
import { getDb } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearAllData, downloadBackupFile, exportBackup, importBackup } from "@/lib/db/backup";
import { InstallAppCard } from "@/components/install-app-card";
import { AddressForm } from "@/components/address-form";

export default function SettingsPage() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  const recipeCount = useLiveQuery(async () => getDb().recipes.count(), [], undefined);
  const mealPlanCount = useLiveQuery(async () => getDb().mealPlanEntries.count(), [], undefined);
  const groceryListCount = useLiveQuery(async () => getDb().groceryLists.count(), [], undefined);
  const savedAddress = useLiveQuery(async () => {
    const row = await getDb().settings.get("app");
    return row?.address ?? null;
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const backup = await exportBackup();
      downloadBackupFile(backup);
      toast.success("Backup downloaded.");
    } catch {
      toast.error("Couldn't create a backup file.");
    } finally {
      setExporting(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const replace = confirm(
      "Import this backup?\n\nClick OK to MERGE it with your current data, or Cancel to abort.\n\n(To fully replace your data instead, delete everything first via 'Erase All Data' below, then import.)",
    );
    if (!replace) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await importBackup(parsed, "merge");
      toast.success(
        `Imported ${result.recipes} recipes, ${result.mealPlanEntries} planned meals, and ${result.groceryLists} grocery lists.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That file couldn't be imported.");
    } finally {
      setImporting(false);
    }
  }

  async function handleClearAll() {
    if (!confirm("This will permanently erase every recipe, meal plan, and grocery list stored on this device. Continue?")) {
      return;
    }
    if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
    setClearing(true);
    try {
      await clearAllData();
      toast.success("All local data erased.");
    } catch {
      toast.error("Couldn't clear local data.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings &amp; Backup</h1>
        <p className="text-[var(--muted-foreground)]">
          Manage your local RecipeVault data — everything lives only in this browser.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" /> Your data, your device
          </CardTitle>
          <CardDescription>
            RecipeVault stores recipes, meal plans, and grocery lists in this browser&apos;s IndexedDB.
            Nothing is uploaded anywhere. Clearing your browser data (or switching browsers/devices)
            means you&apos;ll need to restore from a backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <StatBlock icon={<BookMarked className="h-4 w-4" />} label="Recipes" value={recipeCount} />
          <StatBlock icon={<CalendarDays className="h-4 w-4" />} label="Planned meals" value={mealPlanCount} />
          <StatBlock icon={<ShoppingCart className="h-4 w-4" />} label="Grocery lists" value={groceryListCount} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Shopping address
          </CardTitle>
          <CardDescription>
            Save where you shop (Canada and the US). Grocery-list items will show nearby stores
            and flyer prices — tap a price to open that store&apos;s website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddressForm current={savedAddress ?? null} />
        </CardContent>
      </Card>

      <InstallAppCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5" /> Backup &amp; restore
          </CardTitle>
          <CardDescription>
            Export a JSON snapshot of everything, or restore from a previous export — handy before
            clearing your browser or when moving to a new device.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Backup (.json)
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </CardContent>
      </Card>

      <Card className="border-red-300/60 dark:border-red-900/60">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger zone</CardTitle>
          <CardDescription>Permanently erase all recipes, meal plans, and grocery lists from this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleClearAll} disabled={clearing}>
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Erase All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] py-4 text-center">
      <span className="text-[var(--muted-foreground)]">{icon}</span>
      <span className="text-xl font-semibold">{value ?? "—"}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}
