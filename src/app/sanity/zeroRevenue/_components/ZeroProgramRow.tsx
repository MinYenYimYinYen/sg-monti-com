"use client";

import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

type ZeroProgramRowProps = {
  program: Program;
};

export function ZeroProgramRow({ program }: ZeroProgramRowProps) {
  const { customer } = program;
  const { refreshCustomer, isRefreshingCustomer } = useFullSeasonServices();
  const servStats = program.x.getServStats("renewal");
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
      <ProgramLink
        programId={program.progId}
        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary hover:underline font-mono"
      >
        {program.progCode.progCodeId}
      </ProgramLink>
      <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium font-mono bg-destructive/10 text-destructive tracking-widest">
        {servStats}
      </span>
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
