"use client";

import { LatestBanner } from "@/app/javelin/_lib/components/LatestBanner";
import { JavelinHeader } from "@/app/javelin/_lib/components/JavelinHeader";
import { GenLedgerDropZone } from "@/app/javelin/_lib/components/GenLedgerDropZone";
import { JavelinResultsTable } from "@/app/javelin/_lib/components/JavelinResultsTable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

export function GenLedgerPanel() {
  return (
    <div className="flex flex-col h-full px-4 py-4 sm:px-6 lg:px-8">
      <LatestBanner kind="genLedger" />
      <JavelinHeader />

      <Accordion type="single" collapsible defaultValue="upload" className="shrink-0">
        <AccordionItem value="upload">
          <AccordionTrigger>Upload General Ledger CSVs</AccordionTrigger>
          <AccordionContent>
            <GenLedgerDropZone />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <JavelinResultsTable />
      </div>
    </div>
  );
}
