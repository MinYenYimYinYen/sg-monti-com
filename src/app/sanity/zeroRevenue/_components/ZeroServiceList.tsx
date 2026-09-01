"use client";

import { useSelector } from "react-redux";
import { zeroRevenueSelect } from "@/app/sanity/zeroRevenue/zeroRevenueSelect";
import { ZeroServiceRow } from "@/app/sanity/zeroRevenue/_components/ZeroServiceRow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

export function ZeroServiceList() {
  const groups = useSelector(zeroRevenueSelect.servicesByServCode);

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No zero-revenue services found.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="space-y-1">
      {groups.map((group) => (
        <AccordionItem
          key={group.servCodeId}
          value={group.servCodeId}
          className="border border-border rounded-md bg-card overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-2 hover:bg-accent/10 hover:no-underline">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono font-semibold text-foreground">
                {group.servCodeId}
              </span>
              <span className="text-xs text-muted-foreground">
                {group.count} service{group.count !== 1 ? "s" : ""}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-1">
            <div className="max-h-[40vh] overflow-y-auto space-y-1 pr-2">
              {group.services.map((service) => (
                <ZeroServiceRow key={service.servId} service={service} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
