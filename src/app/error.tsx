"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("RecipeVault error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--muted)]">
        <AlertTriangle className="h-7 w-7 text-[var(--primary)]" />
      </span>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-[var(--muted-foreground)]">
        Your recipes are safe — they&apos;re stored on this device, not on a server. Try again, or
        head back to your library.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/recipes">Back to recipes</Link>
        </Button>
      </div>
    </div>
  );
}
