"use client";

import { InvalidPromiseNoteCustomer } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { PromiseBuilderPopover } from "@/app/sanity/promiseSanity/_components/PromiseBuilderPopover";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

type InvalidPromiseNoteRowProps = {
  invalidNoteCustomer: InvalidPromiseNoteCustomer;
};

/** Group services by their program, preserving insertion order. */
function groupServicesByProgram(services: Service[]): Map<Program, Service[]> {
  const map = new Map<Program, Service[]>();
  for (const service of services) {
    const existing = [...map.entries()].find(([p]) => p.progId === service.program.progId);
    if (existing) {
      existing[1].push(service);
    } else {
      map.set(service.program, [service]);
    }
  }
  return map;
}

export function InvalidPromiseNoteRow({ invalidNoteCustomer }: InvalidPromiseNoteRowProps) {
  const { customer, services } = invalidNoteCustomer;
  const { refreshCustomer, isRefreshingCustomer } = useFullSeasonServices();
  const isRefreshing = isRefreshingCustomer(customer.custId);

  const programGroups = groupServicesByProgram(services);

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
            {services.length} service{services.length !== 1 ? "s" : ""} — no promise note found
          </span>
        </div>
        {customer.techNote && (
          <p className="mt-1 text-xs text-muted-foreground pl-8">{customer.techNote}</p>
        )}
      </div>

      {/* Programs → Services */}
      <div className="divide-y divide-border">
        {[...programGroups.entries()].map(([program, programServices]) => (
          <div key={program.progId} className="px-3 py-2 space-y-1">
            {/* Program row */}
            <div className="flex items-start gap-2 text-xs pl-4">
              <ProgramLink
                programId={program.progId}
                className="rounded px-1.5 py-0.5 font-medium bg-primary/10 text-primary hover:underline font-mono shrink-0"
              >
                {program.progCode.progCodeId}
              </ProgramLink>
              <span className="text-muted-foreground break-words">
                {program.techNote || ""}
              </span>
            </div>

            {/* Service rows */}
            {programServices.map((service) => (
              <div key={service.servId} className="flex items-start gap-2 text-xs pl-10">
                <span className="font-mono font-medium text-foreground shrink-0">
                  {service.servCodeId}
                </span>
                <span className="rounded px-1.5 py-0.5 font-medium bg-destructive/10 text-destructive shrink-0">
                  isPromised — no p[...] note
                </span>
                <PromiseBuilderPopover
                  label={service.servCodeId}
                  customerTechNote={customer.techNote}
                  programTechNote={program.techNote}
                  serviceTechNote={service.techNote}
                />
                {service.techNote && (
                  <span className="text-muted-foreground break-words">{service.techNote}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
