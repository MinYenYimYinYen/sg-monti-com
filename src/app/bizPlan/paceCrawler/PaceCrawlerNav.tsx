"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { BarChart2, CalendarDays, GitBranch, Settings2, Users } from "lucide-react";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { label: "Employee Plan", href: "/bizPlan/paceCrawler", icon: Users },
  { label: "Assignments", href: "/bizPlan/paceCrawler/assignments", icon: Settings2 },
  { label: "Emp Timeline", href: "/bizPlan/paceCrawler/empTimeline", icon: CalendarDays },
  { label: "SC Timeline", href: "/bizPlan/paceCrawler/scTimeline", icon: GitBranch },
  { label: "Gantt", href: "/bizPlan/paceCrawler/gantt", icon: BarChart2 },
] as const;

// ---------------------------------------------------------------------------
// PaceCrawlerNav
// ---------------------------------------------------------------------------

export function PaceCrawlerNav() {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        // Exact match for the root route; prefix match for sub-routes
        const isActive =
          href === "/bizPlan/paceCrawler"
            ? pathname === href
            : pathname.startsWith(href);

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
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
