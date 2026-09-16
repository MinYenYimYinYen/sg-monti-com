"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priceIncreaseSummarySelect } from "@/app/priceIncrease/summary/priceIncreaseSummarySelect";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions, SummaryFlagPerspective } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import {
  customerIncreaseGroupLabels,
  CustomerIncreaseGroupKey,
} from "@/app/priceIncrease/results/customerIncreaseGroupFns";
import { FlagGroupSummary, GroupSummary, RevenueSnapshot } from "@/app/priceIncrease/summary/priceIncreaseSummarySelect";
import { TrendingUp, Users, AlertTriangle, Ban, ArrowUpRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Revenue display helpers
// ---------------------------------------------------------------------------

function fmt$(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

// ---------------------------------------------------------------------------
// GrandTotalCard
// ---------------------------------------------------------------------------

type GrandTotalCardProps = {
  snapshot: RevenueSnapshot;
  exemptOpportunity: RevenueSnapshot;
  totalCustomers: number;
  exemptCount: number;
  conflictCount: number;
  needsManualAttentionCount: number;
  belowAcquisitionCount: number;
  overpricedCount: number;
  noFlagCount: number;
};

function GrandTotalCard({
  snapshot,
  exemptOpportunity,
  totalCustomers,
  exemptCount,
  conflictCount,
  needsManualAttentionCount,
  belowAcquisitionCount,
  overpricedCount,
  noFlagCount,
}: GrandTotalCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Grand Total</span>
        <span className="ml-auto text-xs text-foreground/50 flex items-center gap-1">
          <Users className="h-3 w-3" />
          {totalCustomers} customers
        </span>
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-0.5">
          <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Current</div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{fmt$(snapshot.currentRevenue)}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Projected</div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{fmt$(snapshot.projectedRevenue)}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] text-foreground/40 uppercase tracking-wide">Delta</div>
          <div className={`text-lg font-semibold tabular-nums ${snapshot.revenueDelta >= 0 ? "text-accent" : "text-destructive"}`}>
            {fmt$(snapshot.revenueDelta)}
            <span className="text-sm ml-1 font-normal opacity-70">{fmtPct(snapshot.revenueDeltaPercent)}</span>
          </div>
        </div>
      </div>

      {/* Status badges */}
      {(exemptCount > 0 || conflictCount > 0 || needsManualAttentionCount > 0 || belowAcquisitionCount > 0 || overpricedCount > 0 || noFlagCount > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
          {exemptCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-accent/10 text-foreground/60">
              <Ban className="h-3 w-3" /> {exemptCount} exempt
            </span>
          )}
          {conflictCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive">
              <AlertTriangle className="h-3 w-3" /> {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
            </span>
          )}
          {needsManualAttentionCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-accent/10 text-foreground/60">
              <AlertTriangle className="h-3 w-3" /> {needsManualAttentionCount} needs review
            </span>
          )}
          {belowAcquisitionCount > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-accent/10 text-foreground/60">
              {belowAcquisitionCount} below acq.
            </span>
          )}
          {overpricedCount > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-accent/10 text-foreground/60">
              {overpricedCount} overpriced
            </span>
          )}
          {noFlagCount > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-muted text-foreground/50">
              {noFlagCount} no flag
            </span>
          )}
        </div>
      )}

      {/* Exempt opportunity cost — shown only when there are exempt customers */}
      {exemptOpportunity.currentRevenue > 0 && exemptOpportunity && (
        <div className="pt-2 border-t border-border space-y-1">
          <div className="text-[10px] text-foreground/35 uppercase tracking-wide flex items-center gap-1">
            <Ban className="h-3 w-3" />
            Exempt Opportunity Cost ({exemptCount} customers)
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-0.5">
              <div className="text-[10px] text-foreground/30 uppercase tracking-wide">Current</div>
              <div className="text-sm font-medium text-foreground/50 tabular-nums">{fmt$(exemptOpportunity.currentRevenue)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-foreground/30 uppercase tracking-wide">If Not Exempt</div>
              <div className="text-sm font-medium text-foreground/50 tabular-nums">{fmt$(exemptOpportunity.projectedRevenue)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-foreground/30 uppercase tracking-wide">Foregone</div>
              <div className="text-sm font-medium text-foreground/40 tabular-nums">
                {fmt$(exemptOpportunity.revenueDelta)}
                <span className="text-xs ml-1 font-normal opacity-70">{fmtPct(exemptOpportunity.revenueDeltaPercent)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard — used for both flag groups and generic group summaries
// ---------------------------------------------------------------------------

type SummaryCardProps = {
  label: string;
  customerCount: number;
  snapshot: RevenueSnapshot;
  flagPercent?: number | null;
  accent?: boolean;
};

function SummaryCard({ label, customerCount, snapshot, flagPercent, accent }: SummaryCardProps) {
  const hasIncrease = snapshot.revenueDelta > 0;
  const hasDecrease = snapshot.revenueDelta < 0;

  return (
    <div className={`rounded-lg border bg-card p-3 space-y-2 ${accent ? "border-primary/30" : "border-border"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-foreground leading-tight">{label}</div>
          {flagPercent != null && (
            <div className="text-xs text-foreground/50">
              {flagPercent}% flag
            </div>
          )}
        </div>
        <span className="text-xs text-foreground/50 flex items-center gap-0.5 shrink-0">
          <Users className="h-3 w-3" />
          {customerCount}
        </span>
      </div>

      {/* Revenue */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-foreground/40">Current</span>
          <span className="tabular-nums text-foreground/70">{fmt$(snapshot.currentRevenue)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-foreground/40">Projected</span>
          <span className="tabular-nums text-foreground/70">{fmt$(snapshot.projectedRevenue)}</span>
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-border">
          <span className="text-foreground/40 flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" /> Delta
          </span>
          <span className={`tabular-nums font-medium ${hasIncrease ? "text-accent" : hasDecrease ? "text-destructive" : "text-foreground/40"}`}>
            {fmt$(snapshot.revenueDelta)}
            <span className="ml-1 font-normal opacity-70 text-[10px]">{fmtPct(snapshot.revenueDeltaPercent)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perspective toggle
// ---------------------------------------------------------------------------

const PERSPECTIVES: { value: SummaryFlagPerspective; label: string; description: string }[] = [
  { value: "effective", label: "Effective", description: "Planned outcome — resolvedFlag unless pre-existing overrides" },
  { value: "actual", label: "Actual", description: "What's already in the CRM" },
  { value: "queued", label: "Queued", description: "What would be assigned if Assign All ran now" },
];

// ---------------------------------------------------------------------------
// Group picker
// ---------------------------------------------------------------------------

const ALL_GROUP_KEYS = Object.keys(customerIncreaseGroupLabels) as CustomerIncreaseGroupKey[];

// ---------------------------------------------------------------------------
// Summary page
// ---------------------------------------------------------------------------

export default function PriceIncreaseSummaryPage() {
  const dispatch = useAppDispatch();
  const summary = useSelector(priceIncreaseSummarySelect.summary);
  const summaryGroupKey = useSelector(priceIncreaseConfigSelect.summaryGroupKey);
  const summaryFlagPerspective = useSelector(priceIncreaseConfigSelect.summaryFlagPerspective);

  const { grand, totalCustomers, exemptCount, conflictCount, needsManualAttentionCount, belowAcquisitionCount, overpricedCount, noFlagCount, exemptOpportunity, activePerspective, groupSummaries } = summary;

  function handleSetPerspective(perspective: SummaryFlagPerspective) {
    dispatch(priceIncreaseConfigActions.setSummaryFlagPerspective(perspective));
  }

  function handleSetGroupKey(key: CustomerIncreaseGroupKey | null) {
    dispatch(priceIncreaseConfigActions.setSummaryGroupKey(key));
  }

  if (totalCustomers === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-foreground/40">
        No results — configure settings on the Config tab to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

        {/* Grand total card — always visible */}
        <GrandTotalCard
          snapshot={grand}
          exemptOpportunity={exemptOpportunity}
          totalCustomers={totalCustomers}
          exemptCount={exemptCount}
          conflictCount={conflictCount}
          needsManualAttentionCount={needsManualAttentionCount}
          belowAcquisitionCount={belowAcquisitionCount}
          overpricedCount={overpricedCount}
          noFlagCount={noFlagCount}
        />

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Perspective toggle */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
            {PERSPECTIVES.map((p) => (
              <button
                key={p.value}
                onClick={() => handleSetPerspective(p.value)}
                title={p.description}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  summaryFlagPerspective === p.value
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground/60 hover:bg-accent/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Group-by picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-foreground/40">Group by</span>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => handleSetGroupKey(null)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  !summaryGroupKey
                    ? "bg-accent/20 text-foreground/70 font-medium"
                    : "text-foreground/50 hover:bg-accent/10"
                }`}
              >
                None
              </button>
              {ALL_GROUP_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => handleSetGroupKey(key)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    summaryGroupKey === key
                      ? "bg-accent/20 text-foreground/70 font-medium"
                      : "text-foreground/50 hover:bg-accent/10"
                  }`}
                >
                  {customerIncreaseGroupLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Flag perspective cards */}
        {!summaryGroupKey && activePerspective.length > 0 && (
          <div>
            <div className="text-xs text-foreground/40 mb-2 uppercase tracking-wide">
              {PERSPECTIVES.find((p) => p.value === summaryFlagPerspective)?.label} — by flag
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activePerspective.map((group: FlagGroupSummary) => (
                <SummaryCard
                  key={group.label}
                  label={group.label}
                  customerCount={group.customerCount}
                  snapshot={group}
                  flagPercent={group.flag?.increasePercent}
                  accent={group.flag !== null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Group summaries (when a group key is selected) */}
        {summaryGroupKey && groupSummaries && groupSummaries.length > 0 && (
          <div>
            <div className="text-xs text-foreground/40 mb-2 uppercase tracking-wide">
              By {customerIncreaseGroupLabels[summaryGroupKey]}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {groupSummaries.map((group: GroupSummary) => (
                <SummaryCard
                  key={group.label}
                  label={group.label}
                  customerCount={group.customerCount}
                  snapshot={group}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state for active perspective */}
        {!summaryGroupKey && activePerspective.length === 0 && (
          <div className="text-sm text-foreground/40 text-center py-8">
            No data for the selected perspective.
          </div>
        )}

      </div>
    </div>
  );
}
