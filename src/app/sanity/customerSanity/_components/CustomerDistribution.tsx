"use client";

import { useSelector } from "react-redux";
import { customerSanitySelect } from "@/app/sanity/customerSanity/customerSanitySelect";
import { CustomerRow } from "@/app/sanity/customerSanity/_components/CustomerRow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

export function CustomerDistribution() {
  const groups = useSelector(customerSanitySelect.visibleGroups);

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No customers loaded yet.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="space-y-1">
      {groups.map((group) => {
        // Radix Accordion requires a non-empty string value; use sentinel when all codes are excluded
        const accordionValue = group.comboKey || "(none)";
        return (
          <AccordionItem
            key={accordionValue}
            value={accordionValue}
            className="border border-border rounded-md bg-card overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-2 hover:bg-accent/10 hover:no-underline">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono font-semibold text-foreground">
                  {group.comboKey || "(none)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {group.count} customer{group.count !== 1 ? "s" : ""}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 pt-1">
              <div className="max-h-[40vh] overflow-y-auto space-y-1 pr-2">
                {group.customers.map((customer) => (
                  <CustomerRow key={customer.custId} customer={customer} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
