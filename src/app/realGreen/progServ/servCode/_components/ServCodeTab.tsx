"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { ServCodeListPanel } from "./ServCodeListPanel";
import { ServCodeEditPanel } from "./ServCodeEditPanel";
import { SaveButton, SaveStatus } from "@/components/SaveButton";

export function ServCodeTab() {
  const { saveServCodeChanges } = useProgServ({});
  const servCodes = useSelector(progServSelect.servCodes);
  const unsavedChanges = useSelector(servCodeLookup.unsavedChanges);

  const [selectedServCodeId, setSelectedServCodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await saveServCodeChanges(unsavedChanges);
      setSaveStatus("success");
    } catch (error) {
      console.error("Failed to save changes", error);
      setSaveStatus("idle");
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0">
        <p className="text-sm text-muted-foreground flex-1">
          View and manage SA5 service code extensions.
        </p>
        <SaveButton
          className="w-[12rem]"
          disabled={unsavedChanges.length === 0}
          status={saveStatus}
          onClick={handleSave}
          onSuccessComplete={() => setSaveStatus("idle")}
        >
          Save Changes
        </SaveButton>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: listbox */}
        <ServCodeListPanel
          servCodes={servCodes}
          selectedServCodeId={selectedServCodeId}
          onSelectAction={setSelectedServCodeId}
        />

        {/* Right: edit panel or empty state */}
        <div className="flex-1 min-w-0">
          {selectedServCodeId ? (
            <ServCodeEditPanel
              key={selectedServCodeId}
              servCodeId={selectedServCodeId}
            />
          ) : (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">
                Select a service code to edit its configuration
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
