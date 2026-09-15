"use client";

import { useSelector } from "react-redux";
import { LandPlot, RefreshCw } from "lucide-react";
import { CustomerIncreaseResult } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { ServiceIncreaseRow } from "@/app/priceIncrease/results/_components/ServiceIncreaseRow";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { AssignFlagButton } from "@/app/priceIncrease/results/_components/AssignFlagButton";

// ---------------------------------------------------------------------------
// FormulaStep — 2-row badge: label on top (muted), value on bottom (prominent)
// ---------------------------------------------------------------------------

type FormulaStepProps = {
  label: string;
  value: string;
  highlight?: "primary" | "destructive";
  muted?: boolean;
};

function FormulaStep({ label, value, highlight, muted }: FormulaStepProps) {
  const valueClass =
    highlight === "primary"
      ? "bg-primary text-primary-foreground px-1.5 rounded font-medium"
      : highlight === "destructive"
        ? "text-destructive font-medium"
        : muted
          ? "text-foreground/40"
          : "text-foreground/80 font-medium";

  return (
    <div className="flex flex-col items-center leading-none gap-0.5">
      <span className="text-[10px] text-foreground/35 whitespace-nowrap">{label}</span>
      <span className={`text-xs tabular-nums whitespace-nowrap ${valueClass}`}>{value}</span>
    </div>
  );
}

type CustomerIncreaseCardProps = {
  result: CustomerIncreaseResult;
};

export function CustomerIncreaseCard({ result }: CustomerIncreaseCardProps) {
  const settings = useSelector(priceIncreaseConfigSelect.settings);
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);
  const exemptFlagId = useSelector(globalSettingsSelect.priceIncreaseExemptFlagId);
  const manualFlagId = useSelector(globalSettingsSelect.priceIncreaseManualFlagId);
  const { refreshCustomer, isRefreshingCustomer } = useActiveCustomers();

  const {
    customer,
    targetProgram,
    serviceResults,
    cappedPercent,
    rawPercent,
    calculatedPercent,
    resolvedFlag,
    effectiveFlag,
    preExistingIncreaseFlags,
    sortable,
    groupable,
  } = result;

  const targetProgCodeId = settings?.progCodeId ?? null;
  const { preExistingFlagStatus } = groupable;

  // Renewal flags this customer has
  const renewalFlagIdSet = new Set(
    [renewalFlagIds.autoRenew, renewalFlagIds.dontAutoRenew, renewalFlagIds.confirmed].filter(
      (id): id is number => id !== null,
    ),
  );
  const customerRenewalFlags = customer.flags.filter((f) => renewalFlagIdSet.has(f.flagId));

  const isEcon = targetProgram.x.isEcon;

  // Exempt and manual flags on this customer (shown with destructive styling)
  const exemptManualFlagIds = new Set(
    [exemptFlagId, manualFlagId].filter((id): id is number => id !== null),
  );
  const customerExemptManualFlags = customer.flags.filter((f) => exemptManualFlagIds.has(f.flagId));

  // Pre-existing flag badge styling based on status
  const preExistingBadgeBase = "px-1.5 py-0 rounded text-xs border";
  const preExistingBadgeStyle =
    preExistingFlagStatus === "conflict"
      ? `${preExistingBadgeBase} bg-primary/20 text-primary border-2 border-destructive line-through`
      : preExistingFlagStatus === "override"
        ? `${preExistingBadgeBase} bg-primary/20 text-primary border-2 border-destructive`
        : `${preExistingBadgeBase} bg-primary/20 text-primary border-primary/30`;

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      {/* Customer header */}
      <div className="flex items-center gap-2 px-2 py-1 bg-accent/10 border-b border-border">
        {/* Left: customer identity */}
        <CustomerLink customerId={customer.custId} customerTab="customer" className="flex items-center gap-1.5 hover:underline">
          <span className="text-xs font-mono text-foreground/50">{customer.custId}</span>
          <span className="text-sm font-medium text-foreground">{customer.displayName}</span>
        </CustomerLink>

        {/* Exempt / manual flag badges — shown with destructive styling */}
        {customerExemptManualFlags.length > 0 && (
          <div className="flex gap-1">
            {customerExemptManualFlags.map((flag) => (
              <span
                key={flag.flagId}
                className="px-1.5 py-0 rounded text-xs bg-destructive/20 text-destructive border border-destructive/30"
              >
                {flag.desc}
              </span>
            ))}
          </div>
        )}

        {/* Pre-existing increase flag badges */}
        {preExistingIncreaseFlags.length > 0 && (
          <div className="flex gap-1">
            {preExistingIncreaseFlags.map((flag) => (
              <span key={flag.flagId} className={preExistingBadgeStyle}>
                {flag.desc}
              </span>
            ))}
          </div>
        )}

        {/* Customer size */}
        <span className="flex items-center gap-0.5 text-xs text-foreground/60">
          <LandPlot className="h-3 w-3 shrink-0" />
          {customer.size}
        </span>

        {groupable.needsManualAttention && (
          <span className="px-1.5 py-0 rounded text-xs bg-destructive text-destructive-foreground">
            Review
          </span>
        )}

        {/* Revenue — left of center */}
        <span className="text-xs text-foreground/60">
          <span className="text-foreground/40 mr-0.5">Rev</span>
          ${sortable.customerRevenue.toFixed(2)}
        </span>

        {/* Center: formula strip — Raw → Bonus → Adjusted → [Cap →] Flag [→ Override | Exempt] */}
        <div className="flex items-center gap-1 mx-auto">
          {/* Step 1: Raw percent */}
          <FormulaStep label="Raw" value={`${rawPercent.toFixed(1)}%`} />

          {/* Step 2: Upsell bonus (only shown when bonus actually applied) */}
          {calculatedPercent !== rawPercent && (
            <>
              <span className="text-foreground/30 text-xs">−</span>
              <FormulaStep
                label="Bonus"
                value={`${(rawPercent - calculatedPercent).toFixed(1)}%`}
                muted
              />
              <span className="text-foreground/30 text-xs">=</span>
              <FormulaStep label="Adjusted" value={`${calculatedPercent.toFixed(1)}%`} />
            </>
          )}

          {/* Step 3: Cap (only shown when cap actually reduced the value) */}
          {cappedPercent !== calculatedPercent && (
            <>
              <span className="text-foreground/30 text-xs">→</span>
              <FormulaStep
                label="Capped"
                value={`${cappedPercent.toFixed(1)}%`}
                highlight="destructive"
              />
            </>
          )}

          {/* Exempt customers — show exempt badge instead of flag steps */}
          {groupable.isExempt && (
            <>
              <span className="text-foreground/30 text-xs">→</span>
              <FormulaStep label="Status" value="Exempt" highlight="destructive" />
            </>
          )}

          {/* Step 4: Resolved flag (module's computed flag) — non-exempt only */}
          {!groupable.isExempt && resolvedFlag && (
            <>
              <span className="text-foreground/30 text-xs">→</span>
              <FormulaStep label="Flag" value={resolvedFlag.desc} highlight="primary" />
            </>
          )}

          {/* Step 5: Effective flag override — shown when pre-existing flag differs */}
          {!groupable.isExempt && preExistingFlagStatus === "override" && effectiveFlag && (
            <>
              <span className="text-destructive text-xs">→</span>
              <FormulaStep label="Override" value={effectiveFlag.desc} highlight="destructive" />
            </>
          )}

          {/* Conflict indicator — no effective flag can be determined */}
          {!groupable.isExempt && preExistingFlagStatus === "conflict" && (
            <>
              <span className="text-destructive text-xs">→</span>
              <FormulaStep label="Conflict" value="Resolve flags" highlight="destructive" />
            </>
          )}
        </div>

        {/* Right: non-target program code badges + refresh button */}
        <div className="flex items-center gap-1">
          {customer.programs
            .filter((program) => program.progCode.progCodeId !== targetProgCodeId)
            .map((program) => (
              <span
                key={program.progId}
                className="px-1.5 py-0 rounded text-xs font-mono bg-accent/20 text-foreground/50"
              >
                {program.progCode.progCodeId}
              </span>
            ))}
          <AssignFlagButton result={result} />
          <button
            onClick={() => refreshCustomer(customer.custId)}
            disabled={isRefreshingCustomer(customer.custId)}
            title="Refresh customer data"
            className="ml-1 flex items-center text-foreground/30 hover:text-foreground/60 transition-colors disabled:opacity-40"
          >
            <RefreshCw
              className={`h-3 w-3 ${isRefreshingCustomer(customer.custId) ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Renewal flags section */}
      {customerRenewalFlags.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/5 border-b border-border">
          <span className="text-xs text-foreground/40">Renewal</span>
          {customerRenewalFlags.map((flag) => (
            <span
              key={flag.flagId}
              className="px-1.5 py-0 rounded text-xs bg-accent/20 text-foreground/70 border border-accent/30"
            >
              {flag.desc}
            </span>
          ))}
        </div>
      )}

      {/* Program metadata */}
      <div className="flex items-center gap-3 px-2 py-0.5 bg-card border-b border-border text-xs text-foreground/60">
        {/* Econ/Pref badge */}
        <span
          className={`px-1.5 py-0 rounded font-medium ${
            isEcon
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary/20 text-primary"
          }`}
        >
          {isEcon ? "Econ" : "Pref"}
        </span>

        {targetProgram.dateSold && (
          <span>
            <span className="text-foreground/40">Sold </span>
            {prettyDate(targetProgram.dateSold, "M/d/yyyy", { fallback: targetProgram.dateSold })}
          </span>
        )}

        <span>
          <span className="text-foreground/40">Season </span>
          {sortable.seasonCount}
        </span>

        <span className="ml-auto">
          <span className="text-foreground/40">Program </span>
          ${sortable.programRevenue.toFixed(2)}
        </span>
      </div>

      {/* Service rows — only shown for non-exempt customers */}
      {serviceResults.length > 0 && (
        <>
          <div className="grid grid-cols-7 gap-2 px-2 py-0.5 text-xs text-foreground/40 border-b border-border bg-card">
            <span>Service</span>
            <span>Size</span>
            <span className="text-right">Acq Price</span>
            <span className="text-right">Current</span>
            <span className="text-right">Plan Price</span>
            <span className="text-right">Diff $</span>
            <span className="text-right">Diff %</span>
          </div>
          {serviceResults.map((serviceResult) => (
            <ServiceIncreaseRow key={serviceResult.service.servId} result={serviceResult} />
          ))}
        </>
      )}
    </div>
  );
}
