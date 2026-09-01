"use client";

import { useSelector } from "react-redux";
import { zeroRevenueSelect } from "@/app/sanity/zeroRevenue/zeroRevenueSelect";
import { ZeroProgramRow } from "@/app/sanity/zeroRevenue/_components/ZeroProgramRow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

export function ZeroProgramList() {
  const groups = useSelector(zeroRevenueSelect.programsByProgCode);

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No zero-revenue programs found.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="space-y-1">
      {groups.map((group) => (
        <AccordionItem
          key={group.progCodeId}
          value={group.progCodeId}
          className="border border-border rounded-md bg-card overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-2 hover:bg-accent/10 hover:no-underline">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono font-semibold text-foreground">
                {group.progCodeId}
              </span>
              <span className="text-xs text-muted-foreground">
                {group.count} program{group.count !== 1 ? "s" : ""}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-1">
            <div className="max-h-[40vh] overflow-y-auto space-y-1 pr-2">
              {group.programs.map((program) => (
                <ZeroProgramRow key={program.progId} program={program} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
