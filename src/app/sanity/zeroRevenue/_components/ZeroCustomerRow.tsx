"use client";

import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

type ZeroCustomerRowProps = {
  customer: Customer;
};

export function ZeroCustomerRow({ customer }: ZeroCustomerRowProps) {
  const { refreshCustomer, isRefreshingCustomer } = useFullSeasonServices();
  const activePrograms = customer.programs.filter((p) => p.status === "9");
  const isRefreshing = isRefreshingCustomer(customer.custId);

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
      <Button
        variant="primary"
        intensity="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => refreshCustomer(customer.custId)}
        disabled={isRefreshing}
        title="Refresh customer data"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
