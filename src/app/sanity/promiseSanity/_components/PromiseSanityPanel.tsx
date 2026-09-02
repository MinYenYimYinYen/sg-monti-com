"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { promiseSanitySelect } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { MissingNotesList } from "@/app/sanity/promiseSanity/_components/MissingNotesList";
import { OrphanedNotesList } from "@/app/sanity/promiseSanity/_components/OrphanedNotesList";
import { ValidCasesList } from "@/app/sanity/promiseSanity/_components/ValidCasesList";
import { Tabs, TabsList, TabsTrigger } from "@/style/components/tabs";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

type PromiseSanityTab = "missingNotes" | "orphanedNotes" | "validCases";

export function PromiseSanityPanel() {
  const [activeTab, setActiveTab] = useState<PromiseSanityTab>("missingNotes");
  const { refresh, canRefresh } = useFullSeasonServices();

  const missingNotesCount = useSelector(promiseSanitySelect.missingNotesCount);
  const orphanedNotesCount = useSelector(promiseSanitySelect.orphanedNotesCount);
  const validCasesCount = useSelector(promiseSanitySelect.validCasesCount);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab control + refresh */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as PromiseSanityTab)}
          className="flex-1"
        >
          <TabsList variant="primary">
            <TabsTrigger value="missingNotes" variant="primary">
              Missing Notes{missingNotesCount > 0 ? ` (${missingNotesCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="orphanedNotes" variant="primary">
              Orphaned Notes{orphanedNotesCount > 0 ? ` (${orphanedNotesCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="validCases" variant="primary">
              Valid Cases{validCasesCount > 0 ? ` (${validCasesCount})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="primary"
          intensity="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={refresh}
          disabled={!canRefresh}
          title="Refresh all customer data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-2">
          {activeTab === "missingNotes" && <MissingNotesList />}
          {activeTab === "orphanedNotes" && <OrphanedNotesList />}
          {activeTab === "validCases" && <ValidCasesList />}
        </div>
      </div>
    </div>
  );
}
