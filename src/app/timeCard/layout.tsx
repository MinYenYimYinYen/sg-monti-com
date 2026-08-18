"use client";

import { ReactNode, useEffect } from "react";
import { Clock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { timeCardSelect } from "@/app/timeCard/timeCardSelect";
import { useTimeCard } from "@/app/timeCard/useTimeCard";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

const NAV_LINKS = [
  { label: "Import", href: "/timeCard/import" },
  { label: "Payroll", href: "/timeCard/payroll" },
] as const;

export default function TimeCardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lastImportedDate = useSelector(timeCardSelect.lastImportedDate);
  const { fetchLastImportedDate } = useTimeCard();

  useEffect(() => {
    fetchLastImportedDate();
  }, [fetchLastImportedDate]);

  const lastImportedLabel = lastImportedDate
    ? `Last Imported: ${prettyDate(lastImportedDate, "MMM d yyyy")}`
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-base font-semibold text-foreground">Time Cards</h1>
          {lastImportedLabel && (
            <span className="text-sm text-muted-foreground">{lastImportedLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Button
                key={href}
                variant={isActive ? "primary" : "outline"}
                intensity={isActive ? "solid" : "soft"}
                size="sm"
                asChild
              >
                <Link href={href}>{label}</Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
