"use client";

import { RoutePlanDay } from "@/app/pace/routePlanTypes";
import { RoutePlanEmployeeRow } from "@/app/pace/_components/RoutePlanEmployeeRow";
import { cn } from "@/style/utils";
import { CloudRain } from "lucide-react";

// ---------------------------------------------------------------------------
// Date header formatter
// ---------------------------------------------------------------------------

function formatCardDate(dateStr: string): { weekday: string; monthDay: string } {
  const date = new Date(dateStr + "T00:00:00");
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

// ---------------------------------------------------------------------------
// RoutePlanDateCard
// ---------------------------------------------------------------------------

type RoutePlanDateCardProps = {
  day: RoutePlanDay;
  isToday: boolean;
};

export function RoutePlanDateCard({ day, isToday }: RoutePlanDateCardProps) {
  const { weekday, monthDay } = formatCardDate(day.date);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card min-w-[200px] max-w-[240px] shrink-0",
        isToday ? "border-primary/50 ring-1 ring-primary/30" : "border-border",
        day.isHoliday && "opacity-75",
      )}
    >
      {/* Card header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-lg border-b border-border",
          isToday ? "bg-primary/10" : "bg-muted/40",
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-foreground">{weekday}</span>
          <span className="text-xs text-muted-foreground">{monthDay}</span>
        </div>

        {/* Phase badge */}
        <span
          className={cn(
            "text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide",
            day.phase === "past" && "bg-muted text-muted-foreground",
            day.phase === "present" && "bg-primary/20 text-primary",
            day.phase === "future" && "bg-accent/20 text-accent",
          )}
        >
          {day.phase}
        </span>
      </div>

      {/* Holiday / weather banner */}
      {day.isHoliday && day.holidayDescription && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium border-b border-border",
            day.isWeatherDay
              ? "bg-secondary/10 text-secondary"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {day.isWeatherDay && <CloudRain className="w-3 h-3 shrink-0" />}
          <span className="truncate">{day.holidayDescription}</span>
        </div>
      )}

      {/* Employee rows */}
      <div className="flex flex-col px-3 py-2 gap-0.5 flex-1">
        {day.employees.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No employees assigned</p>
        ) : (
          day.employees.map((employee) => (
            <RoutePlanEmployeeRow
              key={employee.employeeId}
              name={employee.name}
              status={employee.status}
              isHolidayDay={day.isHoliday}
            />
          ))
        )}
      </div>
    </div>
  );
}
