"use client";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { JavelinHeader } from "@/app/javelin/_lib/components/JavelinHeader";
import { GenLedgerDropZone } from "@/app/javelin/_lib/components/GenLedgerDropZone";
import { JavelinResultsTable } from "@/app/javelin/_lib/components/JavelinResultsTable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

export default function JavelinPage() {
  const dispatch = useAppDispatch();
  const genLedgerAccountMap = useSelector(globalSettingsSelect.genLedgerAccountMap);

  // Load GlobalSettings on mount
  useEffect(() => {
    dispatch(
      globalSettingsActions.getSettings({
        params: {},
        config: { showLoading: false },
      }),
    );
  }, [dispatch]);

  // Seed the slice's account map whenever GlobalSettings loads or updates
  useEffect(() => {
    dispatch(javelinActions.initAccountMap(genLedgerAccountMap));
  }, [dispatch, genLedgerAccountMap]);

  return (
    <div className="flex flex-col h-full px-4 py-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">Javelin</h1>

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
