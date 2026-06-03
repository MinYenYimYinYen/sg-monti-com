"use client";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { depositActions } from "@/app/javelin/depositSlice";
import { JavelinHeader } from "@/app/javelin/_lib/components/JavelinHeader";
import { GenLedgerDropZone } from "@/app/javelin/_lib/components/GenLedgerDropZone";
import { JavelinResultsTable } from "@/app/javelin/_lib/components/JavelinResultsTable";
import { DepositHeader } from "@/app/javelin/_lib/components/DepositHeader";
import { DepositDropZone } from "@/app/javelin/_lib/components/DepositDropZone";
import { DepositResultsTable } from "@/app/javelin/_lib/components/DepositResultsTable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";

export default function JavelinPage() {
  const dispatch = useAppDispatch();
  const genLedgerAccountMap = useSelector(globalSettingsSelect.genLedgerAccountMap);
  const depositAccountMap = useSelector(globalSettingsSelect.depositAccountMap);

  // Load GlobalSettings on mount
  useEffect(() => {
    dispatch(
      globalSettingsActions.getSettings({
        params: {},
        config: { showLoading: false },
      }),
    );
  }, [dispatch]);

  // Seed the gen ledger slice's account map whenever GlobalSettings loads or updates
  useEffect(() => {
    dispatch(javelinActions.initAccountMap(genLedgerAccountMap));
  }, [dispatch, genLedgerAccountMap]);

  // Seed the deposit slice's account map whenever GlobalSettings loads or updates
  useEffect(() => {
    dispatch(depositActions.initAccountMap(depositAccountMap));
  }, [dispatch, depositAccountMap]);

  return (
    <div className="flex flex-col h-full px-4 py-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">Javelin</h1>

      <Tabs defaultValue="genLedger" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 mb-4">
          <TabsTrigger value="genLedger">General Ledger</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
        </TabsList>

        <TabsContent value="genLedger" className="flex flex-col flex-1 min-h-0">
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
        </TabsContent>

        <TabsContent value="deposits" className="flex flex-col flex-1 min-h-0">
          <DepositHeader />
          <DepositDropZone />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DepositResultsTable />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
