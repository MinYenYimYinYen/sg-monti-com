"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { promiseSanitySelect } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { validPromisesSelect } from "@/app/sanity/promiseSanity/validPromisesSelect";
import { OrphanedNotesList } from "@/app/sanity/promiseSanity/_components/OrphanedNotesList";
import { InvalidPromiseNoteList } from "@/app/sanity/promiseSanity/_components/InvalidPromiseNoteList";
import { InvalidValuesList } from "@/app/sanity/promiseSanity/_components/InvalidValuesList";
import { ValidPromisesList } from "@/app/sanity/promiseSanity/_components/ValidPromisesList";
import { Tabs, TabsList, TabsTrigger } from "@/style/components/tabs";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

type PromiseSanityTab = "orphanedNotes" | "invalidNote" | "invalidValues" | "validPromises";

export function PromiseSanityPanel() {
  const [activeTab, setActiveTab] = useState<PromiseSanityTab>("invalidNote");
  const { refresh, canRefresh } = useFullSeasonServices();

  const orphanedCount = useSelector(promiseSanitySelect.orphanedNotesCount);
  const invalidNoteCount = useSelector(promiseSanitySelect.invalidPromiseNoteCount);
  const invalidValuesCount = useSelector(promiseSanitySelect.invalidValuesCount);
  const validCount = useSelector(validPromisesSelect.count);

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
            <TabsTrigger value="orphanedNotes" variant="primary">
              Orphaned Notes{orphanedCount > 0 ? ` (${orphanedCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="invalidNote" variant="primary">
              Invalid Promise Note{invalidNoteCount > 0 ? ` (${invalidNoteCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="invalidValues" variant="primary">
              Invalid Values{invalidValuesCount > 0 ? ` (${invalidValuesCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="validPromises" variant="primary">
              Valid Promises{validCount > 0 ? ` (${validCount})` : ""}
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
          {activeTab === "orphanedNotes" && <OrphanedNotesList />}
          {activeTab === "invalidNote" && <InvalidPromiseNoteList />}
          {activeTab === "invalidValues" && <InvalidValuesList />}
          {activeTab === "validPromises" && <ValidPromisesList />}
        </div>
      </div>
    </div>
  );
}
