"use client";

import { InvalidValuesCustomer } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

type InvalidValuesRowProps = {
  invalidValuesCustomer: InvalidValuesCustomer;
};

export function InvalidValuesRow({ invalidValuesCustomer }: InvalidValuesRowProps) {
  const { customer, invalidServices } = invalidValuesCustomer;
  const { refreshCustomer, isRefreshingCustomer } = useFullSeasonServices();
  const isRefreshing = isRefreshingCustomer(customer.custId);

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      {/* Customer header */}
      <div className="px-3 py-2 border-b border-border bg-accent/5">
        <div className="flex items-center gap-2 text-sm">
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
          <CustomerLink
            customerId={customer.custId}
            customerTab="customer"
            className="font-medium text-primary hover:underline"
          >
            {customer.displayName}
          </CustomerLink>
          <span className="text-xs text-muted-foreground shrink-0">
            {invalidServices.length} service{invalidServices.length !== 1 ? "s" : ""} with parse errors
          </span>
        </div>
      </div>

      {/* Service rows */}
      <div className="divide-y divide-border">
        {invalidServices.map(({ service, program, noteText, issues }) => (
          <div key={service.servId} className="px-3 py-2 space-y-1.5">
            {/* Service + program identifier */}
            <div className="flex items-center gap-2 text-xs">
              <ProgramLink
                programId={program.progId}
                className="rounded px-1.5 py-0.5 font-medium bg-primary/10 text-primary hover:underline font-mono shrink-0"
              >
                {program.progCode.progCodeId}
              </ProgramLink>
              <span className="font-mono font-medium text-foreground shrink-0">
                {service.servCodeId}
              </span>
            </div>

            {/* The note that was parsed */}
            <p className="text-xs text-muted-foreground italic pl-2">{noteText}</p>

            {/* Parse issues */}
            <div className="pl-2 flex flex-wrap gap-1">
              {issues.map((issue, i) => (
                <span
                  key={i}
                  className="rounded px-1.5 py-0.5 bg-destructive/15 text-destructive text-[10px] font-medium"
                >
                  {issue}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
