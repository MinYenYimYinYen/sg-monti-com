"use client";

import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";

type ZeroCustomerRowProps = {
  customer: Customer;
};

export function ZeroCustomerRow({ customer }: ZeroCustomerRowProps) {
  const activePrograms = customer.programs.filter((p) => p.status === "9");

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm">
      <CustomerLink
        customerId={customer.custId}
        customerTab="customer"
        className="font-medium text-primary hover:underline truncate flex-1"
      >
        {customer.displayName}
      </CustomerLink>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {activePrograms.map((program) => (
          <ProgramLink
            key={program.progId}
            programId={program.progId}
            className="rounded px-1.5 py-0.5 text-xs font-medium font-mono bg-destructive/10 text-destructive hover:underline"
          >
            {program.progCode.progCodeId}
          </ProgramLink>
        ))}
      </div>
    </div>
  );
}
