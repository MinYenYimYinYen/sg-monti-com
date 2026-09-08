"use client";

import { useSelector } from "react-redux";
import { ServiceIncreaseResult } from "@/app/priceIncrease/results/increaseResultsTypes";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { ServiceIncreaseRow } from "@/app/priceIncrease/results/_components/ServiceIncreaseRow";
import { calcSeasonCount } from "@/app/priceIncrease/_lib/priceIncreaseFuncs";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

type CustomerIncreaseCardProps = {
  serviceResults: ServiceIncreaseResult[];
};

export function CustomerIncreaseCard({ serviceResults }: CustomerIncreaseCardProps) {
  const settings = useSelector(priceIncreaseConfigSelect.settings);
  const increaseFlagMappings = useSelector(globalSettingsSelect.increaseFlagMappings);
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);
  const currentSeason = useSelector(globalSettingsSelect.season);

  const targetProgCodeId = settings?.progCodeId ?? null;

  // All results share the same customer and target program
  const customer = serviceResults[0]?.customer;
  const targetProgram = serviceResults[0]?.service.program;
  if (!customer || !targetProgram) return null;

  // Customer-level renewal revenue across all active programs
  const customerRevenue = customer.x.revenue("renewal");

  // Program-level renewal revenue
  const programRevenue = targetProgram.x.revenue("renewal");

  // Season count for the target program
  const seasonCount = targetProgram.dateSold
    ? calcSeasonCount({ dateSold: targetProgram.dateSold, currentSeason })
    : null;

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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Customer header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-accent/10 border-b border-border">
        <span className="text-sm font-mono text-foreground/50">{customer.custId}</span>
        <span className="text-sm font-medium text-foreground">{customer.displayName}</span>

        {/* Increase-module flag badges */}
        {customerIncreaseFlags.length > 0 && (
          <div className="flex gap-1">
            {customerIncreaseFlags.map((flag) => (
              <span
                key={flag.flagId}
                className="px-2 py-0.5 rounded text-xs bg-secondary/20 text-secondary-foreground border border-secondary/30"
              >
                {flag.desc}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {/* Customer renewal revenue */}
          <span className="text-sm text-foreground/60">
            <span className="text-foreground/40 text-xs mr-1">Revenue</span>
            ${customerRevenue.toFixed(2)}
          </span>

          {/* Program code badges */}
          <div className="flex gap-1">
            {customer.programs.map((program) => (
              <span
                key={program.progId}
                className={`px-2 py-0.5 rounded text-xs font-mono ${
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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 border-b border-border">
          <span className="text-xs text-foreground/40">Renewal</span>
          {customerRenewalFlags.map((flag) => (
            <span
              key={flag.flagId}
              className="px-2 py-0.5 rounded text-xs bg-accent/20 text-foreground/70 border border-accent/30"
            >
              {flag.desc}
            </span>
          ))}
        </div>
      )}

      {/* Program metadata */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-card border-b border-border text-xs text-foreground/60">
        {/* Econ/Pref badge */}
        <span
          className={`px-2 py-0.5 rounded font-medium ${
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

        {seasonCount !== null && (
          <span>
            <span className="text-foreground/40">Season </span>
            {seasonCount}
          </span>
        )}

        <span className="ml-auto">
          <span className="text-foreground/40">Program </span>
          ${programRevenue.toFixed(2)}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-6 gap-2 px-3 py-1 text-xs text-foreground/40 border-b border-border bg-card">
        <span>Service</span>
        <span className="text-right">Acq Price</span>
        <span className="text-right">Current</span>
        <span className="text-right">Plan Price</span>
        <span className="text-right">Diff $</span>
        <span className="text-right">Diff %</span>
      </div>

      {/* Service rows */}
      {serviceResults.map((result) => (
        <ServiceIncreaseRow key={result.service.servId} result={result} />
      ))}
    </div>
  );
}
