"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// TabNav — renders a list of route-based tab links.
//
// Active-state rules:
//   - rootHref gets an exact match (so "/productivity" doesn't activate on
//     "/productivity/byDate").
//   - All other hrefs use pathname.startsWith() for prefix matching.
// ---------------------------------------------------------------------------

export type TabNavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

export function TabNav({
  items,
  rootHref,
}: {
  items: readonly TabNavItem[];
  rootHref: string;
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === rootHref ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </Link>
        );
      })}
    </>
  );
}
