"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    function update() {
      setOffline(!navigator.onLine);
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-[var(--muted)] px-4 py-1.5 text-xs font-medium text-[var(--muted-foreground)]"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You&apos;re offline — recipes, planner, and grocery lists still work from this device.
    </div>
  );
}
