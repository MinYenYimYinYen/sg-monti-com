"use client";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { useJavelin } from "@/app/javelin/useJavelin";
import { JavelinHeader } from "@/app/javelin/_lib/components/JavelinHeader";
import { GenLedgerDropZone } from "@/app/javelin/_lib/components/GenLedgerDropZone";
import { JavelinResultsTable } from "@/app/javelin/_lib/components/JavelinResultsTable";
import { DepositHeader } from "@/app/javelin/_lib/components/DepositHeader";
import { DepositDropZone } from "@/app/javelin/_lib/components/DepositDropZone";
import { DepositResultsTable } from "@/app/javelin/_lib/components/DepositResultsTable";
import { LatestBanner } from "@/app/javelin/_lib/components/LatestBanner";
import { MigrationPanel } from "@/app/javelin/_lib/components/MigrationPanel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/style/components/tabs";

/** Admin only: every operation behind this page reads or writes the live books. */
export default function JavelinPage() {
  const role = useSelector(authSelect.role);

  if (role !== "admin") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-2xl">
          <Alert variant="destructive">
            <AlertTitle>Admins only</AlertTitle>
            <AlertDescription>Only an admin can post journal entries.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  return <JavelinWorkspace />;
}

function JavelinWorkspace() {
  // Loads what was last posted. Account links load on the mapping page, not here: the server
  // reads them itself when it builds each entry.
  useJavelin({ autoLoad: true });

  return (
    <div className="flex flex-col h-full px-4 py-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">Javelin</h1>

      <Tabs defaultValue="genLedger" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 mb-4">
          <TabsTrigger value="genLedger">General Ledger</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="migrate">Migrate mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="genLedger" className="flex flex-col flex-1 min-h-0">
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
        </TabsContent>

        <TabsContent value="deposits" className="flex flex-col flex-1 min-h-0">
          <LatestBanner kind="deposit" />
          <DepositHeader />
          <DepositDropZone />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DepositResultsTable />
          </div>
        </TabsContent>

        <TabsContent value="migrate" className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MigrationPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
