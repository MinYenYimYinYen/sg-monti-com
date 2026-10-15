"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { burndownSelect } from "@/app/pace/burndown/burndownSelect";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { DailyTimingSnapshot, SequenceTimingStats } from "@/app/pace/lib/PaceEngineTypes";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRow(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDollars(value: number): string {
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function formatDays(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}d`;
}

// ---------------------------------------------------------------------------
// SequenceTimingSection — daysSince aggregate stats for a constrained successor group
// ---------------------------------------------------------------------------

type SequenceTimingSectionProps = {
  past: SequenceTimingStats | null;
  future: SequenceTimingStats | null;
};

function SequenceTimingSection({ past, future }: SequenceTimingSectionProps) {
  if (!past && !future) return null;
  const daysSince = past?.daysSince ?? future?.daysSince ?? 0;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        Sequence Timing
        <span className="ml-1 text-foreground font-medium normal-case">(min gap: {daysSince} days)</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Past panel */}
        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Past</div>
          {past && past.count > 0 ? (
            <>
              <StatRow label="On time" value={`${past.countAvailable}`} />
              <StatRow label="Too soon" value={`${past.countLocked}`} valueClass={past.countLocked > 0 ? "text-destructive" : undefined} />
              <StatRow label="No predecessor" value={`${past.countPredecessorNotDone}`} />
              {past.median !== null && (
                <>
                  <div className="border-t border-border pt-1 mt-1" />
                  <StatRow label="Median" value={formatDays(past.median)} />
                  <StatRow label="Mean" value={formatDays(past.mean)} />
                  {past.q1 !== null && past.q3 !== null && (
                    <StatRow label="Q1 / Q3" value={`${past.q1.toFixed(1)} / ${past.q3.toFixed(1)}`} />
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">No completed services.</p>
          )}
        </div>

        {/* Future panel */}
        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Future</div>
          {future && future.count > 0 ? (
            <>
              <StatRow label="Available" value={`${future.countAvailable}`} valueClass="text-accent" />
              <StatRow label="Locked" value={`${future.countLocked}`} valueClass={future.countLocked > 0 ? "text-secondary" : undefined} />
              <StatRow label="Pred. pending" value={`${future.countPredecessorNotDone}`} />
              {future.median !== null && (
                <>
                  <div className="border-t border-border pt-1 mt-1" />
                  <StatRow label="Median" value={formatDays(future.median)} />
                  <StatRow label="Mean" value={formatDays(future.mean)} />
                  {future.q1 !== null && future.q3 !== null && (
                    <StatRow label="Q1 / Q3" value={`${future.q1.toFixed(1)} / ${future.q3.toFixed(1)}`} />
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">No active services.</p>
          )}
        </div>
      </div>
    </div>
  );
}

type StatRowProps = {
  label: string;
  value: string;
  valueClass?: string;
};

function StatRow({ label, value, valueClass }: StatRowProps) {
  return (
    <div className="flex items-center justify-between text-xs gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${valueClass ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupDetail — burndown rows for a single assignment group
// ---------------------------------------------------------------------------

type GroupDetailProps = {
  assignmentGroupId: string;
  label: string;
};

type DailyRow = {
  date: string;
  phase: string;
  remaining: number;
  priceCompleted: number;
  priceForecasted: number;
  snapshot: DailyTimingSnapshot | null;
};

export function GroupDetail({ assignmentGroupId, label }: GroupDetailProps) {
  const rechartsData = useSelector(burndownSelect.rechartsData);
  const sequenceTimingStats = useSelector(paceEngineSelect.sequenceTimingStats);
  const [activeTab, setActiveTab] = useState<"price" | "daysSince">("price");

  const dateRange = rechartsData.groupDateRanges.get(assignmentGroupId);

  // Find timing stats for this group (it's a constrained successor if entries exist)
  const pastTiming = sequenceTimingStats.find(
    (s) => s.groupId === assignmentGroupId && s.phase === "past",
  ) ?? null;
  const futureTiming = sequenceTimingStats.find(
    (s) => s.groupId === assignmentGroupId && s.phase === "future",
  ) ?? null;

  // Build a Map<date, DailyTimingSnapshot> for quick lookup
  const snapshotByDate = new Map<string, DailyTimingSnapshot>();
  for (const snapshot of futureTiming?.dailySnapshots ?? []) {
    snapshotByDate.set(snapshot.date, snapshot);
  }

  const hasDaysSince = (futureTiming?.dailySnapshots?.length ?? 0) > 0;
  const daysSince = futureTiming?.daysSince ?? pastTiming?.daysSince ?? 0;

  // Extract per-day rows for this group, restricted to its effective date range
  const groupRows: DailyRow[] = rechartsData.rows
    .filter((row) =>
      dateRange
        ? row.date >= dateRange.effectiveStart && row.date <= dateRange.effectiveEnd
        : true,
    )
    .map((row) => {
      const remaining = row[assignmentGroupId];
      const dailyStats = rechartsData.groupDailyStats.get(row.date)?.get(assignmentGroupId);
      return {
        date: row.date,
        phase: row.phase,
        remaining: typeof remaining === "number" ? remaining : 0,
        priceCompleted: dailyStats?.priceCompleted ?? 0,
        priceForecasted: dailyStats?.priceForecasted ?? 0,
        snapshot: snapshotByDate.get(row.date) ?? null,
      };
    })
    .filter((r) => r.remaining > 0.01);

  const totalPool = groupRows.length > 0 ? groupRows[0].remaining : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Selected Group</div>
        <div className="text-base font-semibold text-foreground">{label}</div>
        {dateRange && (
          <div className="text-xs text-muted-foreground">
            {formatDateRow(dateRange.effectiveStart)} → {formatDateRow(dateRange.effectiveEnd)}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Starting pool</span>
        <span className="font-semibold text-foreground tabular-nums">{formatDollars(totalPool)}</span>
      </div>

      {/* Sequence timing aggregate stats — only shown for constrained successor groups */}
      {(pastTiming || futureTiming) && (
        <>
          <div className="border-t border-border" />
          <SequenceTimingSection past={pastTiming} future={futureTiming} />
        </>
      )}

      {/* Daily detail — tabbed between Price Drain and Days Since */}
      {groupRows.length > 0 ? (
        <div className="space-y-2">
          <div className="border-t border-border" />

          {/* Tab bar */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("price")}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded border transition-colors",
                activeTab === "price"
                  ? "bg-primary/20 border-primary/50 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              Price Drain
            </button>
            {hasDaysSince && (
              <button
                onClick={() => setActiveTab("daysSince")}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded border transition-colors",
                  activeTab === "daysSince"
                    ? "bg-primary/20 border-primary/50 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                Days Since
              </button>
            )}
          </div>

          {/* Tab content */}
          {activeTab === "price" ? (
            /* Price Drain tab — 4-column grid: Date | Done | Plan | Left */
            <div className="grid text-xs" style={{ gridTemplateColumns: "auto 3.5rem 3.5rem 3.5rem" }}>
              <span className="text-[10px] text-muted-foreground pb-0.5" />
              <span className="text-[10px] text-muted-foreground text-right pb-0.5">Done</span>
              <span className="text-[10px] text-muted-foreground text-right pb-0.5">Plan</span>
              <span className="text-[10px] text-muted-foreground text-right pb-0.5">Left</span>

              {groupRows.map(({ date, phase, remaining, priceCompleted, priceForecasted }) => {
                const isPast = phase === "past" || phase === "present";
                return (
                  <>
                    <span key={`${date}-date`} className="text-muted-foreground pr-2 py-px">{formatDateRow(date)}</span>
                    <span key={`${date}-done`} className={`text-right tabular-nums py-px ${priceCompleted > 0 ? "text-accent" : "text-transparent"}`}>
                      {priceCompleted > 0 ? formatDollars(priceCompleted) : "—"}
                    </span>
                    <span key={`${date}-plan`} className={`text-right tabular-nums py-px ${!isPast && priceForecasted > 0 ? "text-muted-foreground" : "text-transparent"}`}>
                      {!isPast && priceForecasted > 0 ? formatDollars(priceForecasted) : "—"}
                    </span>
                    <span key={`${date}-left`} className="text-right tabular-nums font-medium text-foreground py-px">
                      {formatDollars(remaining)}
                    </span>
                  </>
                );
              })}
            </div>
          ) : (
            /* Days Since tab — 5-column grid: Date | Avail | Locked | Pend | Median */
            <div className="grid text-xs" style={{ gridTemplateColumns: "auto 2.5rem 2.5rem 2.5rem 3rem" }}>
              <span className="text-[10px] text-muted-foreground pb-0.5" />
              <span className="text-[10px] text-muted-foreground text-right pb-0.5">Avail</span>
              <span className="text-[10px] text-muted-foreground text-right pb-0.5">Lock</span>
              <span className="text-[10px] text-muted-foreground text-right pb-0.5">Pend</span>
              <span className="text-[10px] text-muted-foreground text-right pb-0.5">Median</span>

              {groupRows.map(({ date, snapshot }) => (
                <>
                  <span key={`${date}-date`} className="text-muted-foreground pr-2 py-px">{formatDateRow(date)}</span>
                  <span key={`${date}-avail`} className={`text-right tabular-nums py-px ${snapshot && snapshot.countAvailable > 0 ? "text-accent" : "text-muted-foreground"}`}>
                    {snapshot ? snapshot.countAvailable : "—"}
                  </span>
                  <span key={`${date}-lock`} className={`text-right tabular-nums py-px ${snapshot && snapshot.countLocked > 0 ? "text-secondary" : "text-muted-foreground"}`}>
                    {snapshot ? snapshot.countLocked : "—"}
                  </span>
                  <span key={`${date}-pend`} className="text-right tabular-nums py-px text-muted-foreground">
                    {snapshot ? snapshot.countPredecessorNotDone : "—"}
                  </span>
                  <span key={`${date}-med`} className="text-right tabular-nums py-px text-foreground">
                    {snapshot ? formatDays(snapshot.median) : "—"}
                  </span>
                </>
              ))}

              {/* Footer note */}
              <span className="col-span-5 text-[9px] text-muted-foreground pt-1">
                Min gap: {daysSince} days. Lock = predecessor done but &lt;{daysSince}d elapsed.
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No remaining pool for this group.</p>
      )}
    </div>
  );
}
