"use client";

import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";

type ZeroServiceRowProps = {
  service: Service;
};

export function ZeroServiceRow({ service }: ZeroServiceRowProps) {
  const { program } = service;
  const { customer } = program;

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
      <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-accent/10 text-accent font-mono">
        {service.servCodeId}
      </span>
      <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
        $0.00
      </span>
    </div>
  );
}
