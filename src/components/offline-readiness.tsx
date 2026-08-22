"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Share,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatBytes,
  getOfflineCacheStatus,
  getStorageStatus,
  primeOfflineCache,
  requestPersistentStorage,
  type OfflineCacheStatus,
  type StorageStatus,
} from "@/lib/pwa/storage";
import { isStandaloneDisplay } from "@/lib/pwa";
import { cn } from "@/lib/utils";

function StatusRow({
  ok,
  title,
  detail,
  action,
}: {
  ok: boolean;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{detail}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function OfflineReadiness() {
  const [storage, setStorage] = React.useState<StorageStatus | null>(null);
  const [cache, setCache] = React.useState<OfflineCacheStatus | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [s, c] = await Promise.all([getStorageStatus(), getOfflineCacheStatus()]);
    setStorage(s);
    setCache(c);
    setInstalled(isStandaloneDisplay());
  }, []);

  React.useEffect(() => {
    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    refresh();
  }, [refresh]);

  async function handlePersist() {
    const granted = await requestPersistentStorage();
    if (granted) {
      toast.success("Storage is now persistent — your recipes won't be evicted.");
    } else {
      toast.warning(
        "The browser declined persistent storage. Adding RecipeVault to your Home Screen usually grants it.",
      );
    }
    refresh();
  }

  async function handlePrime() {
    setBusy(true);
    try {
      await primeOfflineCache();
      // Give the worker a moment to finish downloading before re-reading.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await refresh();
      toast.success("Offline copy updated. You can go fully offline now.");
    } catch {
      toast.error("Couldn't refresh the offline copy.");
    } finally {
      setBusy(false);
    }
  }

  const allGood = installed && cache?.ready && storage?.persisted;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WifiOff className="h-5 w-5" /> Offline readiness
        </CardTitle>
        <CardDescription>
          RecipeVault is built to work with the network completely off. Here&apos;s exactly where
          this device stands — no guessing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium",
            allGood
              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "bg-[var(--muted)] text-[var(--foreground)]",
          )}
        >
          {allGood
            ? "✓ Fully offline-capable on this device"
            : "Finish the steps below for guaranteed offline access"}
        </div>

        <StatusRow
          ok={installed}
          title={installed ? "Installed to Home Screen" : "Not installed yet"}
          detail={
            installed
              ? "Launching from the Home Screen icon runs RecipeVault full-screen and protects your data from browser cleanup."
              : isIos
                ? "In Safari, tap Share → Add to Home Screen. On iOS this is what keeps your recipes from being deleted after 7 days."
                : "Use your browser's Install / Add to Home Screen option."
          }
          action={
            isIos && !installed ? (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <Share className="h-3.5 w-3.5" /> Share → Add to Home Screen
              </span>
            ) : null
          }
        />

        <StatusRow
          ok={Boolean(storage?.persisted)}
          title={storage?.persisted ? "Storage is persistent" : "Storage is not persistent yet"}
          detail={
            storage?.persisted
              ? `Your recipes are protected from automatic cleanup. Using ${formatBytes(
                  storage.usageBytes,
                )} of local storage.`
              : "Safari clears normal site data after about 7 days of inactivity. Granting persistence stops that."
          }
          action={
            !storage?.persisted && storage?.supported ? (
              <Button size="sm" variant="outline" onClick={handlePersist}>
                <ShieldCheck className="h-4 w-4" /> Make storage permanent
              </Button>
            ) : null
          }
        />

        <StatusRow
          ok={Boolean(cache?.ready)}
          title={cache?.ready ? "App saved for offline use" : "Offline copy incomplete"}
          detail={
            cache?.ready
              ? `${cache.cachedEntries} files cached, including the app's code — it will boot with zero connection.`
              : "Tap below to download the app's pages and code so it can start with no network."
          }
          action={
            <Button size="sm" variant="outline" onClick={handlePrime} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {cache?.ready ? "Refresh offline copy" : "Save app for offline"}
            </Button>
          }
        />

        <p className="text-xs text-[var(--muted-foreground)]">
          Works offline: your recipe library, cook mode, timers, the meal planner, and grocery
          lists. Needs a connection: importing a recipe from a URL and looking up store prices —
          both fetch live data from the web.
        </p>
      </CardContent>
    </Card>
  );
}
