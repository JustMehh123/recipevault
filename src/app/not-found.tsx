import Link from "next/link";
import { CookingPot } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--muted)]">
        <CookingPot className="h-7 w-7 text-[var(--muted-foreground)]" />
      </span>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-[var(--muted-foreground)]">
        That page isn&apos;t on the menu. It may have been deleted, or the link might be wrong.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/recipes">Go to recipes</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
