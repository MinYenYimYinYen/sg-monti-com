"use client";

import { EmployeeDayStatus } from "@/app/pace/routePlanTypes";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Dollar formatter
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Status chip config
// ---------------------------------------------------------------------------

type ChipConfig = {
  label: string;
  className: string;
  detail?: string;
};

function getChipConfig(status: EmployeeDayStatus): ChipConfig {
  switch (status.kind) {
    case "holiday":
      return { label: "Holiday", className: "bg-muted text-muted-foreground" };
    case "unplanned-absence":
      return { label: "Absent", className: "bg-destructive/20 text-destructive" };
    case "pto":
      return { label: "PTO", className: "bg-secondary/20 text-secondary" };
    case "not-started":
      return { label: "Not started", className: "bg-muted text-muted-foreground" };
    case "done":
      return { label: "Done", className: "bg-muted text-muted-foreground" };
    case "completed":
      return {
        label: formatPrice(status.totalPrice),
        className: "bg-accent/20 text-accent",
        detail: status.servCodeIds.join(", "),
      };
    case "scheduled":
      return {
        label: `Scheduled (${status.serviceCount})`,
        className: "bg-primary/20 text-primary",
      };
    case "projected":
      return {
        label: status.groupLabel,
        className: "bg-accent/10 text-accent",
        detail: status.goalDailyPrice !== null ? formatPrice(status.goalDailyPrice) : undefined,
      };
    case "available":
      return { label: "Available", className: "bg-muted/50 text-muted-foreground" };
  }
}

// ---------------------------------------------------------------------------
// RoutePlanEmployeeRow
// ---------------------------------------------------------------------------

type RoutePlanEmployeeRowProps = {
  name: string;
  status: EmployeeDayStatus;
  isHolidayDay: boolean;
};

export function RoutePlanEmployeeRow({ name, status, isHolidayDay }: RoutePlanEmployeeRowProps) {
  const chip = getChipConfig(status);

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-0.5",
        isHolidayDay && "opacity-40",
      )}
    >
      <span className="text-xs text-foreground truncate min-w-0 flex-1">{name}</span>
      {chip.detail && (
        <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{chip.detail}</span>
      )}
      <span
        className={cn(
          "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
          chip.className,
        )}
      >
        {chip.label}
      </span>
    </div>
  );
}
