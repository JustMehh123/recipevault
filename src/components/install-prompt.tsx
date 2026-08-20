"use client";

import * as React from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandaloneDisplay } from "@/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "recipevault-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplay()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);

    if (isIos && isSafari) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferred(null);
  }

  if (!visible) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg px-3 md:bottom-4">
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
          <Download className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install RecipeVault</p>
          {iosHint ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Tap the <Share className="mx-0.5 inline h-3 w-3" /> Share button, then{" "}
              <strong>Add to Home Screen</strong> for a full-screen app.
            </p>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">
              Add it to your home screen — works offline, no app store needed.
            </p>
          )}
          {!iosHint && deferred && (
            <Button size="sm" className="mt-2" onClick={install}>
              Install app
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
