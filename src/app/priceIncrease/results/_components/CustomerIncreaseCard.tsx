"use client";

import { useSelector } from "react-redux";
import { CustomerIncreaseResult } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { ServiceIncreaseRow } from "@/app/priceIncrease/results/_components/ServiceIncreaseRow";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";

type CustomerIncreaseCardProps = {
  result: CustomerIncreaseResult;
};

export function CustomerIncreaseCard({ result }: CustomerIncreaseCardProps) {
  const settings = useSelector(priceIncreaseConfigSelect.settings);
  const increaseFlagMappings = useSelector(globalSettingsSelect.increaseFlagMappings);
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);

  const { customer, targetProgram, serviceResults, cappedPercent, resolvedFlag, sortable, groupable } = result;

  const targetProgCodeId = settings?.progCodeId ?? null;

  // Increase-module flags this customer has
  const increaseFlagIds = new Set(increaseFlagMappings.map((m) => m.flagId));
  const customerIncreaseFlags = customer.flags.filter((f) => increaseFlagIds.has(f.flagId));

  // Renewal flags this customer has
  const renewalFlagIdSet = new Set(
    [renewalFlagIds.autoRenew, renewalFlagIds.dontAutoRenew, renewalFlagIds.confirmed].filter(
      (id): id is number => id !== null,
    ),
  );
  const customerRenewalFlags = customer.flags.filter((f) => renewalFlagIdSet.has(f.flagId));

  const isEcon = targetProgram.x.isEcon;

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      {/* Customer header */}
      <div className="flex items-center gap-2 px-2 py-1 bg-accent/10 border-b border-border">
        <CustomerLink customerId={customer.custId} customerTab="customer" className="flex items-center gap-1.5 hover:underline">
          <span className="text-xs font-mono text-foreground/50">{customer.custId}</span>
          <span className="text-sm font-medium text-foreground">{customer.displayName}</span>
        </CustomerLink>

        {/* Increase-module flag badges */}
        {customerIncreaseFlags.length > 0 && (
          <div className="flex gap-1">
            {customerIncreaseFlags.map((flag) => (
              <span
                key={flag.flagId}
                className="px-1.5 py-0 rounded text-xs bg-secondary/20 text-secondary-foreground border border-secondary/30"
              >
                {flag.desc}
              </span>
            ))}
          </div>
        )}

        {/* Status badges */}
        {groupable.isExempt && (
          <span className="px-1.5 py-0 rounded text-xs bg-destructive/20 text-destructive border border-destructive/30">
            Exempt
          </span>
        )}
        {groupable.needsManualAttention && (
          <span className="px-1.5 py-0 rounded text-xs bg-destructive text-destructive-foreground">
            Review
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Resolved flag */}
          {resolvedFlag && (
            <span className="text-xs text-foreground/60 font-medium">
              {resolvedFlag.desc}
            </span>
          )}

          {/* Capped percent */}
          <span className={`text-xs font-medium tabular-nums ${groupable.isOverpriced ? "text-destructive" : "text-foreground/70"}`}>
            {cappedPercent.toFixed(1)}%
          </span>

          {/* Customer renewal revenue */}
          <span className="text-xs text-foreground/60">
            <span className="text-foreground/40 mr-0.5">Rev</span>
            ${sortable.customerRevenue.toFixed(2)}
          </span>

          {/* Program code badges */}
          <div className="flex gap-1">
            {customer.programs.map((program) => (
              <span
                key={program.progId}
                className={`px-1.5 py-0 rounded text-xs font-mono ${
                  program.progCode.progCodeId === targetProgCodeId
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/20 text-foreground/50"
                }`}
              >
                {program.progCode.progCodeId}
              </span>
            ))}
          </div>
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
          <div className="grid grid-cols-6 gap-2 px-2 py-0.5 text-xs text-foreground/40 border-b border-border bg-card">
            <span>Service</span>
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
