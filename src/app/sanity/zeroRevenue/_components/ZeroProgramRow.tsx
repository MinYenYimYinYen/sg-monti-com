"use client";

import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";

type ZeroProgramRowProps = {
  program: Program;
};

export function ZeroProgramRow({ program }: ZeroProgramRowProps) {
  const { customer } = program;
  const servStats = program.x.getServStats("renewal");

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm">
      <CustomerLink
        customerId={customer.custId}
        customerTab="customer"
        className="font-medium text-primary hover:underline truncate flex-1"
      >
        {customer.displayName}
      </CustomerLink>
      <ProgramLink
        programId={program.progId}
        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary hover:underline font-mono"
      >
        {program.progCode.progCodeId}
      </ProgramLink>
      <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium font-mono bg-destructive/10 text-destructive tracking-widest">
        {servStats}
      </span>
    </div>
  );
}
