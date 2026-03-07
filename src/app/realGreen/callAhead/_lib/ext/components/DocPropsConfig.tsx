"use client";

import { callAheadSelect } from "@/app/realGreen/callAhead/selectors/callAheadSelect";
import { useSelector } from "react-redux";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/style/components/collapsible";
import React, { useState } from "react";
import { keywordSelect } from "@/app/realGreen/callAhead/selectors/keywordSelect";
import EntityMultiSelector from "@/components/EntityMultiSelector";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

export function DocPropsConfig({ callAheadId }: { callAheadId: number }) {
  const { upsertDocProps } = useCallAhead({ autoLoad: false });
  const docMap = useSelector(callAheadSelect.callAheadDocMap);
  const doc = docMap.get(callAheadId);
  const keywords = useSelector(keywordSelect.keywords);

  const [isKeywordsOpen, setIsKeywordsOpen] = useState(false);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>(
    doc?.keywordIds || [],
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Update local state if doc keywordIds change externally
  React.useEffect(() => {
    if (doc) {
      setSelectedKeywordIds(doc.keywordIds);
    }
  }, [doc]);

  if (!doc) return null;

  const hasChanges =
    JSON.stringify([...selectedKeywordIds].sort()) !==
    JSON.stringify([...doc.keywordIds].sort());
  const canSave = hasChanges;

  const handleSave = async () => {
    if (!canSave) return;

    setSaveStatus("saving");
    try {
      upsertDocProps({
        callAheadId: doc.callAheadId,
        keywordIds: selectedKeywordIds,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("idle");
      console.error("Failed to update doc props:", error);
    }
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
  };



  return (
    <div className={"flex items-center gap-2"}>
      <div className="w-24">{doc.callAheadId}</div>
      <div className="flex-1">{doc.description}</div>
      <Collapsible
        open={isKeywordsOpen}
        onOpenChange={setIsKeywordsOpen}
        className={"relative"}
      >
        <CollapsibleTrigger asChild className={"capitalize flex items-center justify-center w-60"}>
          <Button variant={"outline"}>{doc.keywordIds.length ? doc.keywordIds.join(", ") : "none"}</Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="absolute right-0 top-full z-50 mt-2 w-125 rounded-md border bg-popover p-4 shadow-md">
          <EntityMultiSelector
            items={keywords}
            getItemId={(keyword) => keyword.keywordId}
            getItemLabel={(keyword) => (
              <div className={"grid grid-cols-[10rem_1fr] gap-2"}>
                <div>{keyword.keywordId}</div>
                <div>{keyword.message}</div>
              </div>
            )}
            selectedIds={selectedKeywordIds}
            onChange={(ids) => setSelectedKeywordIds(ids)}
          />
        </CollapsibleContent>
      </Collapsible>
      <SaveButton
        status={saveStatus}
        onClick={handleSave}
        disabled={!canSave}
        onSuccessComplete={handleSuccessComplete}
      >
        Save
      </SaveButton>
    </div>
  );
}
