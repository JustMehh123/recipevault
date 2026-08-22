"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ShoppingCart, Trash2, CalendarDays, CopyPlus } from "lucide-react";
import { WeeklyGrid } from "@/components/weekly-grid";
import { MobilePlanner } from "@/components/mobile-planner";
import { Button } from "@/components/ui/button";
import { generateGroceryListFromWeekDetailed } from "@/lib/db/grocery";
import { clearWeek, copyWeek } from "@/lib/db/mealPlan";
import { addDays, formatWeekRange, getWeekStart } from "@/lib/utils";

export default function PlannerPage() {
  const router = useRouter();
  const [weekStart, setWeekStart] = React.useState(() => getWeekStart());
  const [generating, setGenerating] = React.useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { list, skippedStaples } = await generateGroceryListFromWeekDetailed(weekStart);
      if (list.items.length === 0) {
        toast.warning("This week's plan is empty — add some meals first.");
      } else {
        toast.success(
          `Generated a grocery list with ${list.items.length} items.` +
            (skippedStaples > 0 ? ` Skipped ${skippedStaples} pantry staple${skippedStaples === 1 ? "" : "s"}.` : ""),
        );
        router.push(`/grocery?list=${list.id}`);
      }
    } catch {
      toast.error("Couldn't generate the grocery list.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleClear() {
    if (!confirm("Clear every meal scheduled this week?")) return;
    await clearWeek(weekStart);
    toast.success("Week cleared.");
  }

  async function handleCopyLastWeek() {
    const previous = addDays(weekStart, -7);
    const copied = await copyWeek(previous, weekStart);
    if (copied === 0) {
      toast.warning("The previous week has no meals to copy.");
      return;
    }
    toast.success(`Copied ${copied} meal${copied === 1 ? "" : "s"} from last week.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Weekly Meal Planner</h1>
          <p className="text-[var(--muted-foreground)]">
            Drag recipes onto the grid to plan breakfast, lunch, and dinner for the week.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setWeekStart((w) => addDays(w, -7))} size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-[170px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-[var(--muted-foreground)]" />
            {formatWeekRange(weekStart)}
          </div>
          <Button variant="outline" onClick={() => setWeekStart((w) => addDays(w, 7))} size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekStart !== getWeekStart() && (
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(getWeekStart())}>
              Today
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGenerate} disabled={generating}>
          <ShoppingCart className="h-4 w-4" /> Generate List from Week
        </Button>
        <Button variant="outline" onClick={handleCopyLastWeek}>
          <CopyPlus className="h-4 w-4" /> Copy Last Week
        </Button>
        <Button variant="outline" onClick={handleClear}>
          <Trash2 className="h-4 w-4" /> Clear Week
        </Button>
      </div>

      <MobilePlanner weekStart={weekStart} />
      <WeeklyGrid weekStart={weekStart} />
    </div>
  );
}
