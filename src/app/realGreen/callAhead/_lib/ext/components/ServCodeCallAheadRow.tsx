"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { Input } from "@/style/components/input";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { UnsavedServCodeChanges } from "@/app/realGreen/progServ/_lib/types/ProgServState";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

type ServCodeCallAheadRowProps = {
  servCodeId: string;
};

function buildDocProps(doc: ServCodeDoc): UnsavedServCodeChanges["original"] {
  return {
    servCodeId: doc.servCodeId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    dateRange: doc.dateRange,
    alwaysAsap: doc.alwaysAsap,
    productRuleDocs: doc.productRuleDocs,
    callAheadTag: doc.callAheadTag ?? null,
  };
}

export function ServCodeCallAheadRow({ servCodeId }: ServCodeCallAheadRowProps) {
  const { updateServCode, saveServCodeChanges } = useProgServ({});
  const doc = useSelector(servCodeLookup.docById(servCodeId));

  const [tag, setTag] = useState(doc?.callAheadTag ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  if (!doc) return null;

  const currentTag = doc.callAheadTag ?? "";
  const hasChanges = tag.trim() !== currentTag;

  const handleSave = async () => {
    if (!hasChanges) return;

    const tagValue = tag.trim() === "" ? null : tag.trim();

    setSaveStatus("saving");
    try {
      // Build the change entry directly from the current doc — avoids stale selector race condition
      const original = buildDocProps(doc);
      const change: UnsavedServCodeChanges = {
        original,
        updated: { ...original, callAheadTag: tagValue },
      };
      await saveServCodeChanges([change]);
      // Sync local Redux state so the UI reflects the saved value
      updateServCode({ servCodeId, callAheadTag: tagValue });
      setSaveStatus("success");
    } catch (error) {
      console.error("Failed to save callAheadTag:", error);
      setSaveStatus("idle");
    }
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-32 shrink-0 font-mono text-sm">{servCodeId}</div>
      <div className="flex-1 text-sm text-muted-foreground truncate">
        {doc.longName}
      </div>
      <Input
        placeholder="Call-ahead tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        disabled={saveStatus === "saving" || saveStatus === "success"}
        className="flex-1"
      />
      <SaveButton
        status={saveStatus}
        onClick={handleSave}
        disabled={!hasChanges}
        onSuccessComplete={handleSuccessComplete}
      >
        Save
      </SaveButton>
    </div>
  );
}
