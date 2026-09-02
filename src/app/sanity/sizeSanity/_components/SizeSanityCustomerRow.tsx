"use client";

import { SizeSanityCustomer, SizeSanityReason } from "@/app/sanity/sizeSanity/sizeSanitySelect";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

const REASON_LABELS: Record<SizeSanityReason, string> = {
  inconsistentSizes: "Inconsistent Sizes",
  inconsistentPrices: "Inconsistent Prices",
  customerSizeMismatch: "Size Mismatch",
};

const REASON_CLASSES: Record<SizeSanityReason, string> = {
  inconsistentSizes: "bg-destructive/10 text-destructive",
  inconsistentPrices: "bg-secondary/10 text-secondary",
  customerSizeMismatch: "bg-accent/10 text-accent",
};

type SizeSanityCustomerRowProps = {
  sizeSanityCustomer: SizeSanityCustomer;
};

export function SizeSanityCustomerRow({ sizeSanityCustomer }: SizeSanityCustomerRowProps) {
  const { customer, flaggedPrograms } = sizeSanityCustomer;
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
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            size: {customer.size.toLocaleString()}
          </span>
        </div>
        {customer.techNote && (
          <p className="mt-1 text-xs text-muted-foreground italic pl-8">
            {customer.techNote}
          </p>
        )}
      </div>

      {/* Flagged programs */}
      <div className="divide-y divide-border">
        {flaggedPrograms.map(({ program, reason }) => {
          const renewalServices = program.services.filter((s) => s.status !== "N");
          return (
            <div key={program.progId} className="px-3 py-2 space-y-1.5">
              {/* Program row */}
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <ProgramLink
                  programId={program.progId}
                  className="rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary hover:underline font-mono"
                >
                  {program.progCode.progCodeId}
                </ProgramLink>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${REASON_CLASSES[reason]}`}
                >
                  {REASON_LABELS[reason]}
                </span>
              </div>
              {program.techNote && (
                <p className="text-xs text-muted-foreground italic pl-1">
                  {program.techNote}
                </p>
              )}

              {/* Service detail */}
              <div className="pl-2 space-y-1">
                {renewalServices.map((service) => (
                  <div key={service.servId} className="space-y-0.5">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-mono font-medium text-foreground w-16 shrink-0">
                        {service.servCodeId}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        size:{" "}
                        <span className="font-medium text-foreground">
                          {service.size.toLocaleString()}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        nextSize:{" "}
                        <span className="font-medium text-foreground">
                          {service.nextSize.toLocaleString()}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        price:{" "}
                        <span className="font-medium text-foreground">
                          ${service.price.toFixed(2)}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        next:{" "}
                        <span className="font-medium text-foreground">
                          ${service.nextPrice.toFixed(2)}
                        </span>
                      </span>
                    </div>
                    {service.techNote && (
                      <p className="text-xs text-muted-foreground italic pl-20">
                        {service.techNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
