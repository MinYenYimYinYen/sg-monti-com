"use client";

import { useSelector } from "react-redux";
import { zeroRevenueSelect } from "@/app/sanity/zeroRevenue/zeroRevenueSelect";
import { ZeroCustomerRow } from "@/app/sanity/zeroRevenue/_components/ZeroCustomerRow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

export function ZeroCustomerList() {
  const customers = useSelector(zeroRevenueSelect.customers);

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No zero-revenue customers found.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="space-y-1">
      <AccordionItem
        value="customers"
        className="border border-border rounded-md bg-card overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-2 hover:bg-accent/10 hover:no-underline">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-foreground">All Customers</span>
            <span className="text-xs text-muted-foreground">
              {customers.length} customer{customers.length !== 1 ? "s" : ""}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3 pt-1">
          <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-2">
            {customers.map((customer) => (
              <ZeroCustomerRow key={customer.custId} customer={customer} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
