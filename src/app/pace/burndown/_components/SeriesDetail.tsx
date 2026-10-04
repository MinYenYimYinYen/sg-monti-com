"use client";

import { useSelector } from "react-redux";
import { BurndownSeries, burndownSelect } from "@/app/pace/burndownSelect";
import { formatDollars, formatDate } from "@/app/pace/burndown/_components/burndownHelpers";

export function SeriesDetail({ series }: { series: BurndownSeries }) {
  const mainDate = useSelector(burndownSelect.mainDate);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{series.label}</h2>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span
            className={`rounded px-1.5 py-0.5 ${series.kind === "sequence" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}
          >
            {series.kind}
          </span>
          <span>Total pool: {formatDollars(series.totalPool)}</span>
          {series.plannedEnd && <span>Planned end: {formatDate(series.plannedEnd)}</span>}
          {series.projectedEndDate && (
            <span
              className={
                series.projectedEndDate > (series.plannedEnd ?? "")
                  ? "text-destructive font-semibold"
                  : "text-accent font-semibold"
              }
            >
              Projected end: {formatDate(series.projectedEndDate)}
            </span>
          )}
        </div>
      </div>

      {/* Placeholder chart area */}
      <div className="border border-border rounded-lg bg-card p-6 flex flex-col items-center justify-center gap-3 min-h-48 mb-4">
        <p className="text-sm text-muted-foreground font-semibold">Burndown Chart</p>
        <p className="text-[11px] text-muted-foreground text-center max-w-sm">
          Chart UI is deferred. The data is wired up and verifiable in the table below. The chart
          will show actual history (left of {formatDate(mainDate)}) and projected trajectory
          (right).
        </p>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-primary" />
            <span>Actual (past)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-primary/40 border-dashed border-t border-primary/40" />
            <span>Projected (future)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0 h-3 border-l border-secondary" />
            <span>Planned end</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0 h-3 border-l border-destructive" />
            <span>Projected end</span>
          </div>
        </div>
      </div>

      {/* Data table */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Pool History ({series.poolHistory.length} snapshots)
        </p>
        <table className="text-xs border-separate border-spacing-0 w-full max-w-lg">
          <thead>
            <tr className="bg-accent/10">
              <th className="text-left px-2 py-1 border border-border font-semibold">Date</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Completed</th>
              <th className="text-right px-2 py-1 border border-border font-semibold">Remaining</th>
              <th className="text-left px-2 py-1 border border-border font-semibold">Phase</th>
            </tr>
          </thead>
          <tbody>
            {series.poolHistory.map((snapshot, idx) => {
              const isPast = snapshot.date <= mainDate;
              return (
                <tr
                  key={idx}
                  className={
                    snapshot.date === mainDate ? "bg-secondary/10" : isPast ? "" : "opacity-70"
                  }
                >
                  <td className="px-2 py-0.5 border border-border font-mono text-muted-foreground">
                    {formatDate(snapshot.date)}
                    {snapshot.date === mainDate && (
                      <span className="ml-1 text-[9px] text-secondary">← today</span>
                    )}
                  </td>
                  <td className="px-2 py-0.5 border border-border text-right font-mono text-accent">
                    {formatDollars(snapshot.completed)}
                  </td>
                  <td className="px-2 py-0.5 border border-border text-right font-mono text-foreground">
                    {formatDollars(snapshot.remaining)}
                  </td>
                  <td className="px-2 py-0.5 border border-border text-[9px] text-muted-foreground">
                    {isPast ? "actual" : "projected"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
