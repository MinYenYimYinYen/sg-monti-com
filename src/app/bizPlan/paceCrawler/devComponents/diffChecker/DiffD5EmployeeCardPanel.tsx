"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { employeeCardSelect } from "@/app/bizPlan/paceCrawler/employeeCardSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { paceCrawlerActions } from "@/app/bizPlan/paceCrawler/paceCrawlerSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { DatePicker } from "@/components/DatePicker";
import { cn } from "@/style/utils";
import { ChevronRight } from "lucide-react";
import type {
  EmployeeCardData,
  OpenServCodeRow,
  OpenGroupRow,
  OpenGroupMemberRow,
} from "@/app/bizPlan/paceCrawler/employeeCardSelect";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDollars(n: number | null): string {
  if (n === null) return "—";
  if (!isFinite(n)) return "∞";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatPercent(n: number | null): string {
  if (n === null || !isFinite(n)) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(0)}%`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

// ---------------------------------------------------------------------------
// ThreeValueRow — shows Goal / Actual / Required for a group or single
// ---------------------------------------------------------------------------

function ThreeValueRow({
  goalDailyPrice,
  historicalDailyPrice,
  requiredDailyPrice,
  isOverdue,
}: {
  goalDailyPrice: number | null;
  historicalDailyPrice: number;
  requiredDailyPrice: number;
  isOverdue: boolean;
}) {
  const requiredColor = isOverdue ? "text-destructive" : "text-primary";

  return (
    <div className="flex flex-col gap-0.5 text-[10px] font-mono">
      {goalDailyPrice !== null && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground w-14 shrink-0">Goal:</span>
          <span className="text-accent font-semibold">{formatDollars(goalDailyPrice)}/day</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground w-14 shrink-0">Actual:</span>
        <span className="text-foreground">{formatDollars(historicalDailyPrice)}/day</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground w-14 shrink-0">Required:</span>
        <span className={`font-semibold ${requiredColor}`}>
          {isOverdue ? "∞" : formatDollars(requiredDailyPrice)}/day
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SingleServCodeRow
// ---------------------------------------------------------------------------

function SingleServCodeRow({ row }: { row: OpenServCodeRow }) {
  const statusColor = row.isOverdue
    ? "text-destructive"
    : row.isAhead
      ? "text-accent"
      : row.isBehind
        ? "text-secondary"
        : "text-muted-foreground";

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      {/* ServCode ID + status badge */}
      <div className="w-14 shrink-0 pt-0.5 flex flex-col gap-0.5">
        <span className="font-mono text-xs text-foreground truncate">
          {row.servCodeId}
        </span>
        {row.isOverdue && (
          <span className="text-[9px] text-destructive bg-destructive/10 rounded px-1 leading-tight w-fit">
            overdue
          </span>
        )}
        {!row.isOverdue && row.isBehind && (
          <span className="text-[9px] text-secondary bg-secondary/10 rounded px-1 leading-tight w-fit">
            behind
          </span>
        )}
        {!row.isOverdue && row.isAhead && (
          <span className="text-[9px] text-accent bg-accent/10 rounded px-1 leading-tight w-fit">
            ahead
          </span>
        )}
      </div>

      {/* Three-value display */}
      <div className="flex-1 min-w-0">
        <ThreeValueRow
          goalDailyPrice={row.goalDailyPrice}
          historicalDailyPrice={row.historicalDailyPrice}
          requiredDailyPrice={row.requiredDailyPrice}
          isOverdue={row.isOverdue}
        />
      </div>

      {/* Pool remaining + days left */}
      <div className="text-right shrink-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          {formatDollars(row.poolRemaining)} left
        </div>
        {!row.isOverdue && row.remainingWeekdays > 0 && (
          <div className="font-mono text-[10px] text-muted-foreground">
            {row.remainingWeekdays}d
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupMemberRow
// ---------------------------------------------------------------------------

function GroupMemberRow({ member }: { member: OpenGroupMemberRow }) {
  return (
    <div className="flex items-center gap-2 py-1 pl-4 border-b border-border/20 last:border-0">
      <span className="font-mono text-[10px] text-muted-foreground w-12 shrink-0">
        ↳ {member.servCodeId}
      </span>
      <div className="flex-1 min-w-0">
        <span className={`font-mono text-[10px] font-semibold ${member.isOverdue ? "text-destructive" : "text-primary"}`}>
          {formatDollars(member.requiredDailyPrice)}/day required
        </span>
        {member.isOverdue && (
          <span className="ml-1 text-[9px] text-destructive bg-destructive/10 rounded px-1">overdue</span>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          {formatDollars(member.poolRemaining)} left
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {member.isOverdue ? "—" : `${formatDate(member.scMax)} (${member.remainingWeekdays}d)`}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupEntryRow
// ---------------------------------------------------------------------------

function GroupEntryRow({ row }: { row: OpenGroupRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/40 last:border-0">
      {/* Group header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2 py-1.5 text-left hover:bg-accent/5 transition-colors"
      >
        {/* Expand chevron + label */}
        <div className="w-14 shrink-0 pt-0.5 flex flex-col gap-0.5">
          <span className="flex items-center gap-0.5">
            <ChevronRight
              className={`w-3 h-3 text-primary shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            <span className="font-mono text-[10px] text-primary font-semibold truncate">
              {row.label}
            </span>
          </span>
          <span className="text-[9px] text-primary bg-primary/10 rounded px-1 leading-tight w-fit">
            group
          </span>
          {row.isOverdue && (
            <span className="text-[9px] text-destructive bg-destructive/10 rounded px-1 leading-tight w-fit">
              overdue
            </span>
          )}
          {!row.isOverdue && row.isBehind && (
            <span className="text-[9px] text-secondary bg-secondary/10 rounded px-1 leading-tight w-fit">
              behind
            </span>
          )}
          {!row.isOverdue && row.isAhead && (
            <span className="text-[9px] text-accent bg-accent/10 rounded px-1 leading-tight w-fit">
              ahead
            </span>
          )}
        </div>

        {/* Three-value display */}
        <div className="flex-1 min-w-0">
          <ThreeValueRow
            goalDailyPrice={row.goalDailyPrice}
            historicalDailyPrice={row.historicalDailyPrice}
            requiredDailyPrice={row.requiredDailyPrice}
            isOverdue={row.isOverdue}
          />
        </div>

        {/* Combined pool + group window */}
        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] text-muted-foreground">
            {formatDollars(row.combinedPool)} left
          </div>
          {row.latestScMax && (
            <div className="font-mono text-[10px] text-muted-foreground">
              ends {formatDate(row.latestScMax)}
            </div>
          )}
        </div>
      </button>

      {/* Member sub-rows (shown when expanded) */}
      {expanded && (
        <div className="bg-accent/5">
          {row.members.map((member) => (
            <GroupMemberRow key={member.servCodeId} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmployeeCard
// ---------------------------------------------------------------------------

function EmployeeCard({ cardData }: { cardData: EmployeeCardData }) {
  const { employee, isAlreadyRouted, openEntries } = cardData;

  const headerBg = isAlreadyRouted ? "bg-destructive/10" : "bg-accent/10";

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div className={cn("flex items-center justify-between px-3 py-2 border-b rounded-t-lg", headerBg)}>
        <span className="text-sm font-semibold text-foreground truncate">
          {employee.name}
        </span>
        {isAlreadyRouted && (
          <span className="text-destructive text-xs font-medium shrink-0 ml-2">
            ⚠ Routed
          </span>
        )}
      </div>

      {/* Entry rows */}
      <div className="flex-1 px-3 py-1">
        {openEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No open servCodes on this date
          </p>
        ) : (
          openEntries.map((entry) => {
            if (entry.kind === "single") {
              return <SingleServCodeRow key={entry.servCodeId} row={entry} />;
            } else {
              return <GroupEntryRow key={entry.groupId} row={entry} />;
            }
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiffD5EmployeeCardPanel
// ---------------------------------------------------------------------------

export function DiffD5EmployeeCardPanel() {
  const dispatch = useAppDispatch();
  const mainDate = useSelector(paceCrawlerSelect.mainDate);
  const cardData = useSelector(employeeCardSelect.employeeCardData);

  const withOpen = cardData.filter((c) => c.openEntries.length > 0).length;
  const withOverdue = cardData.filter((c) =>
    c.openEntries.some((r) => r.isOverdue),
  ).length;
  const withBehind = cardData.filter((c) =>
    c.openEntries.some((r) => r.isBehind && !r.isOverdue),
  ).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card">
        <DatePicker
          value={mainDate}
          onChange={(date) => dispatch(paceCrawlerActions.setMainDate(date))}
        />
        <span className="text-[10px] text-muted-foreground">
          {withOpen} employees with open work
          {withOverdue > 0 && (
            <span className="text-destructive ml-2">· {withOverdue} overdue</span>
          )}
          {withBehind > 0 && (
            <span className="text-secondary ml-2">· {withBehind} behind</span>
          )}
        </span>
      </div>

      {/* Legend */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border/40 bg-card/50 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span><strong className="text-accent">Goal</strong> = daily revenue target ($/day)</span>
        <span><strong className="text-foreground">Actual</strong> = lookback avg (what's happening)</span>
        <span><strong className="text-primary">Required</strong> = what's needed to finish on time</span>
        <span>Groups: click ▶ to expand members</span>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-row flex-wrap gap-4 content-start">
          {cardData.map((card) => (
            <EmployeeCard key={card.employee.employeeId} cardData={card} />
          ))}
          {cardData.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No assigned employees found. Configure assignments first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
