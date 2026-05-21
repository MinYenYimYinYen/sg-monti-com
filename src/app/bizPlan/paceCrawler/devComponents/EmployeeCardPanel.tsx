"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  employeeCardSelect,
  EmployeeCardPlanData,
  OpenServCodeRow,
} from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { paceCrawlerActions } from "@/app/bizPlan/paceCrawler/paceCrawlerSlice";
import { UrgentServCodeCard } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/UrgentServCodeCard";
import { DatePicker } from "@/components/DatePicker";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// ServCodeRow — one row per open servCode on the card
// ---------------------------------------------------------------------------

function ServCodeRow({ row }: { row: OpenServCodeRow }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="font-mono text-xs text-foreground w-14 shrink-0 truncate">
        {row.servCodeId}
      </span>
      <span className="font-mono text-xs font-semibold text-foreground flex-1">
        {row.dailyRate > 0 ? `${formatDollars(row.dailyRate)}/day` : "—"}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
        {row.poolRemaining > 0
          ? `${formatDollars(row.poolRemaining)} left`
          : ""}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeCard
// ---------------------------------------------------------------------------

function EmployeeCard({ cardData }: { cardData: EmployeeCardPlanData }) {
  const { employee, isAlreadyRouted, openServCodes } = cardData;

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b rounded-t-lg",
          isAlreadyRouted ? "bg-destructive/10" : "bg-accent/10",
        )}
      >
        <span className="text-sm font-semibold text-foreground truncate">
          {employee.name}
        </span>
        {isAlreadyRouted && (
          <span className="text-destructive text-xs font-medium shrink-0 ml-2">
            ⚠ Already Routed
          </span>
        )}
      </div>

      {/* ServCode rows */}
      <div className="flex-1 px-3 py-1">
        {openServCodes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No open servCodes on this date
          </p>
        ) : (
          openServCodes.map((row) => (
            <ServCodeRow key={row.servCodeId} row={row} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeCardPanel
// ---------------------------------------------------------------------------

export function EmployeeCardPanel() {
  const dispatch = useAppDispatch();
  const mainDate = useSelector(paceCrawlerSelect.mainDate);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card">
        <DatePicker
          value={mainDate}
          onChange={(date) => dispatch(paceCrawlerActions.setMainDate(date))}
        />
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-row flex-wrap gap-4 content-start">
          <UrgentServCodeCard />
          {/*{cardPlanData.map((cardData) => (*/}
          {/*  <EmployeeCard*/}
          {/*    key={cardData.employee.employeeId}*/}
          {/*    cardData={cardData}*/}
          {/*  />*/}
        </div>
      </div>
    </div>
  );
}
