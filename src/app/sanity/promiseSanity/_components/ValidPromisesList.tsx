"use client";

import { useSelector } from "react-redux";
import { validPromisesSelect } from "@/app/sanity/promiseSanity/validPromisesSelect";
import { ValidPromiseGroup } from "@/app/sanity/promiseSanity/validPromisesSelect";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

type EntryByCustomer = {
  customer: Customer;
  programs: { program: Program; services: Service[] }[];
};

function groupEntriesByCustomer(group: ValidPromiseGroup): EntryByCustomer[] {
  // Group entries by customer
  const byCustomer = new Grouper(group.entries).groupBy((e) => e.customer.custId).toMap();

  return [...byCustomer.entries()].map(([, entries]) => {
    const customer = entries[0].customer;
    // Group by program within each customer
    const byProgram = new Grouper(entries).groupBy((e) => e.program.progId).toMap();
    const programs = [...byProgram.entries()].map(([, progEntries]) => ({
      program: progEntries[0].program,
      services: progEntries.map((e) => e.service),
    }));
    return { customer, programs };
  });
}

export function ValidPromisesList() {
  const groups = useSelector(validPromisesSelect.groups);

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No valid promise notes found.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="space-y-1">
      {groups.map((group) => {
        const customerGroups = groupEntriesByCustomer(group);
        return (
          <AccordionItem
            key={group.normalizedNote}
            value={group.normalizedNote}
            className="border border-border rounded-md bg-card overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-2 hover:bg-accent/10 hover:no-underline">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono font-semibold text-foreground">
                  {group.normalizedNote}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {group.count} service{group.count !== 1 ? "s" : ""}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 pt-1">
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                {customerGroups.map(({ customer, programs }) => (
                  <div key={customer.custId} className="space-y-1">
                    {/* Customer */}
                    <CustomerLink
                      customerId={customer.custId}
                      customerTab="customer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {customer.displayName}
                    </CustomerLink>

                    {/* Programs → Services */}
                    {programs.map(({ program, services }) => (
                      <div key={program.progId} className="pl-4 flex items-center gap-2 flex-wrap">
                        <ProgramLink
                          programId={program.progId}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:underline font-mono shrink-0"
                        >
                          {program.progCode.progCodeId}
                        </ProgramLink>
                        {services.map((service) => (
                          <span
                            key={service.servId}
                            className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-accent/10 text-foreground"
                          >
                            {service.servCodeId}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
