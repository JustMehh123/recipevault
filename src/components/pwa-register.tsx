"use client";

import * as React from "react";

/** Registers the RecipeVault service worker so the installed app works offline. */
export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration can fail on HTTP (non-localhost) — ignore.
    });
  }, []);

  return null;
}
