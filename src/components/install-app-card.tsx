"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isStandaloneDisplay } from "@/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppCard() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [ios, setIos] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandaloneDisplay());
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIos(isIos);

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("RecipeVault is installing…");
      setInstalled(true);
    }
    setDeferred(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" /> Install as an app
        </CardTitle>
        <CardDescription>
          RecipeVault is a Progressive Web App. Install it on your phone or computer for a
          full-screen, offline experience — no App Store or Google Play account required.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-[var(--muted-foreground)]">
        {installed ? (
          <p className="rounded-lg bg-[var(--muted)] px-3 py-2 font-medium text-[var(--foreground)]">
            You&apos;re already running RecipeVault as an installed app. Nice.
          </p>
        ) : deferred ? (
          <Button onClick={handleInstall} className="self-start">
            <Download className="h-4 w-4" /> Install RecipeVault
          </Button>
        ) : ios ? (
          <ol className="list-decimal space-y-1 pl-5">
            <li>Tap the Share button in Safari.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap Add. RecipeVault now launches like a native app.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open this site in Chrome, Edge, or Safari.</li>
            <li>
              Look for the install icon in the address bar, or the browser menu item{" "}
              <strong>Install RecipeVault</strong> / <strong>Add to Home Screen</strong>.
            </li>
            <li>Confirm. The app opens in its own window, with your recipes stored on this device.</li>
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
