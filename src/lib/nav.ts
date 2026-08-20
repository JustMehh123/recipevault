import { BookMarked, CalendarDays, Settings, ShoppingCart, type LucideIcon } from "lucide-react";

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/recipes", label: "Recipes", icon: BookMarked },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
