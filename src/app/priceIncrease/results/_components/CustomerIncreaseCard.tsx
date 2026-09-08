"use client";

import { useSelector } from "react-redux";
import { ServiceIncreaseResult } from "@/app/priceIncrease/results/increaseResultsTypes";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { ServiceIncreaseRow } from "@/app/priceIncrease/results/_components/ServiceIncreaseRow";

type CustomerIncreaseCardProps = {
  serviceResults: ServiceIncreaseResult[];
};

export function CustomerIncreaseCard({ serviceResults }: CustomerIncreaseCardProps) {
  const settings = useSelector(priceIncreaseConfigSelect.settings);
  const targetProgCodeId = settings?.progCodeId ?? null;

  // All results share the same customer
  const customer = serviceResults[0]?.customer;
  if (!customer) return null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Customer header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-accent/10 border-b border-border">
        <span className="text-sm font-mono text-foreground/50">{customer.custId}</span>
        <span className="text-sm font-medium text-foreground">{customer.displayName}</span>
        <div className="flex gap-1 ml-auto">
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
