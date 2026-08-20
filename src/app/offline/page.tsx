import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline — RecipeVault",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--muted)]">
        <WifiOff className="h-7 w-7 text-[var(--muted-foreground)]" />
      </span>
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-md text-[var(--muted-foreground)]">
        RecipeVault still works without a connection — your recipes, meal plan, and grocery list
        live on this device. Open a page you&apos;ve already visited, or reconnect to import new recipes.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/recipes">Open recipes</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/planner">Open planner</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/grocery">Open grocery list</Link>
        </Button>
      </div>
    </div>
  );
}
