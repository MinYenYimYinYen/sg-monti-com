"use client";

import { callAheadSelect } from "@/app/realGreen/callAhead/selectors/callAheadSelect";
import { useSelector } from "react-redux";
import React, { useState } from "react";
import { keywordSelect } from "@/app/realGreen/callAhead/selectors/keywordSelect";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { NotificationType } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import {
  CollapsibleMultiSelector,
  MultiSelect,
} from "@/components/MultiSelect";

const notificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.Text]: "Text",
  [NotificationType.Manual]: "Manual",
  [NotificationType.Phone]: "Phone",
  [NotificationType.Email]: "Email",
};

const allNotificationTypes = Object.values(NotificationType);

export function DocPropsConfig({ callAheadId }: { callAheadId: number }) {
  const { upsertDocProps } = useCallAhead({ autoLoad: false });
  const docMap = useSelector(callAheadSelect.callAheadDocMap);
  const doc = docMap.get(callAheadId);
  const keywords = useSelector(keywordSelect.keywords);

  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>(
    doc?.keywordIds || [],
  );
  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState<NotificationType[]>(
    doc?.notificationTypes || [],
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Update local state if doc properties change externally
  React.useEffect(() => {
    if (doc) {
      setSelectedKeywordIds(doc.keywordIds);
      setSelectedNotificationTypes(doc.notificationTypes);
    }
  }, [doc]);

  if (!doc) return null;

  const hasChanges =
    JSON.stringify([...selectedKeywordIds].sort()) !==
      JSON.stringify([...doc.keywordIds].sort()) ||
    JSON.stringify([...selectedNotificationTypes].sort()) !==
      JSON.stringify([...doc.notificationTypes].sort());
  const canSave = hasChanges;

  const handleSave = async () => {
    if (!canSave) return;

    setSaveStatus("saving");
    try {
      upsertDocProps({
        callAheadId: doc.callAheadId,
        keywordIds: selectedKeywordIds,
        notificationTypes: selectedNotificationTypes,
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
      <MultiSelect
        collapsible={true}
        items={keywords}
        selectedIds={selectedKeywordIds}
        getItemId={(keyword) => keyword.keywordId}
        getItemLabel={(keyword) => (
          <div className={"grid grid-cols-[10rem_1fr] gap-2"}>
            <div>{keyword.keywordId}</div>
            <div>{keyword.message}</div>
          </div>
        )}
        getTriggerLabel={(keyword) => keyword.keywordId}
        onChange={(ids) => setSelectedKeywordIds(ids)}
        triggerClassName="w-60"
        popoverClassName="w-125"
      />
      <MultiSelect
        collapsible={true}

        items={allNotificationTypes}
        selectedIds={selectedNotificationTypes}
        getItemId={(type) => type}
        getItemLabel={(type) => <div>{notificationTypeLabels[type]}</div>}
        getTriggerLabel={(type) => notificationTypeLabels[type]}
        onChange={(types) => setSelectedNotificationTypes(types as NotificationType[])}
        triggerClassName="w-40"
        popoverClassName="w-60"
      />
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
