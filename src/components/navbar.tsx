"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat } from "lucide-react";
import { APP_NAV_ITEMS, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
            <ChefHat className="h-5 w-5" />
          </span>
          <span>RecipeVault</span>
        </Link>

        <nav className="flex items-center gap-1">
          {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:flex",
                  active
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
