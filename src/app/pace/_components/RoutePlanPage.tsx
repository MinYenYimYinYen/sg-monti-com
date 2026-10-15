"use client";

import { useSelector } from "react-redux";
import { routePlanSelect } from "@/app/pace/routePlanSelect";
import { paceSelect } from "@/app/pace/paceSelect";
import { RoutePlanDateCard } from "@/app/pace/_components/RoutePlanDateCard";
import { RoutePlanDay } from "@/app/pace/routePlanTypes";

// ---------------------------------------------------------------------------
// Week row — 5 cards side by side
// ---------------------------------------------------------------------------

type WeekRowProps = {
  label: string;
  days: RoutePlanDay[];
  mainDate: string;
};

function WeekRow({ label, days, mainDate }: WeekRowProps) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
        {label}
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {days.map((day) => (
          <RoutePlanDateCard
            key={day.date}
            day={day}
            isToday={day.date === mainDate}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoutePlanPage
// ---------------------------------------------------------------------------

export function RoutePlanPage() {
  const routePlanDays = useSelector(routePlanSelect.routePlanDays);
  const mainDate = useSelector(paceSelect.mainDate);

  if (routePlanDays.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 flex items-center justify-center text-sm text-muted-foreground">
          No data — set up assignment groups and a scenario to see the route plan.
        </div>
      </div>
    );
  }

  // routePlanDays is always exactly 10 entries: [Mon–Fri week 1, Mon–Fri week 2]
  const thisWeek = routePlanDays.slice(0, 5);
  const nextWeek = routePlanDays.slice(5, 10);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Route Plan</h2>
          <p className="text-sm text-muted-foreground">
            Two-week view — employee availability, production, and projected work.
          </p>
        </div>

        <WeekRow label="This Week" days={thisWeek} mainDate={mainDate} />
        <WeekRow label="Next Week" days={nextWeek} mainDate={mainDate} />

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground pt-1 border-t border-border">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-accent/20" />
            Completed (past production)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary/20" />
            Scheduled (printed route)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-accent/10" />
            Projected (engine forecast)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary/20" />
            PTO
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-destructive/20" />
            Absent (unplanned)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-muted" />
            Unavailable / not started / done
          </span>
        </div>
      </div>
    </div>
  );
}
