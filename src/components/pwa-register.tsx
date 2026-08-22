"use client";

import * as React from "react";
import { toast } from "sonner";
import { requestPersistentStorage } from "@/lib/pwa/storage";

/**
 * Registers the service worker, asks for durable storage so Safari can't
 * evict saved recipes, and offers a reload when a new version ships.
 */
export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;

    // Durable storage matters even before the SW is ready — it's what stops
    // WebKit's 7-day eviction from deleting the user's recipes.
    requestPersistentStorage().catch(() => undefined);

    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            // A new worker is ready and an old one is still controlling the page.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              toast("A new version of RecipeVault is ready.", {
                duration: 12000,
                action: {
                  label: "Reload",
                  onClick: () => {
                    installing.postMessage({ type: "SKIP_WAITING" });
                    window.location.reload();
                  },
                },
              });
            }
          });
        });
      })
      .catch(() => {
        // Registration fails on plain HTTP (non-localhost) — nothing to do.
      });

    // Re-check for updates when the app is brought back to the foreground.
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => undefined);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return null;
}
