"use client";

import { Input } from "@/style/components/input";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Button } from "@/style/components/button";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { useSelector } from "react-redux";
import { keywordSelect } from "@/app/realGreen/callAhead/selectors/keywordSelect";
import React, { useState } from "react";

interface KeywordEditProps {
  keywordId: string;
}

export function KeywordEdit({ keywordId }: KeywordEditProps) {
  const { upsertKeyword, deleteKeyword } = useCallAhead({ autoLoad: false });
  const keywordMap = useSelector(keywordSelect.keywordMap);
  const keyword = keywordMap.get(keywordId);

  const [editedMessage, setEditedMessage] = useState(keyword?.message || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update local state if keyword changes externally
  React.useEffect(() => {
    if (keyword) {
      setEditedMessage(keyword.message);
    }
  }, [keyword]);

  if (!keyword) {
    return null;
  }

  const hasChanges = editedMessage.trim() !== keyword.message;
  const canSave = hasChanges && editedMessage.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;

    setSaveStatus("saving");
    try {
      upsertKeyword(keywordId, editedMessage.trim());
      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("idle");
      console.error("Failed to update keyword:", error);
    }
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
  };

  const handleDelete = async () => {
    try {
      deleteKeyword(keywordId);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete keyword:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input value={keywordId} disabled={true} className="w-48 opacity-60" />
      <Input
        value={editedMessage}
        onChange={(e) => setEditedMessage(e.target.value)}
        disabled={saveStatus === "saving" || saveStatus === "success"}
        className="flex-1"
      />
      <SaveButton
        status={saveStatus}
        onClick={handleSave}
        disabled={!canSave}
        onSuccessComplete={handleSuccessComplete}
      >
        Save
      </SaveButton>

      {!showDeleteConfirm ? (
        <Button
          variant="destructive"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={saveStatus === "saving" || saveStatus === "success"}
        >
          Delete
        </Button>
      ) : (
        <div className="flex gap-1">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Yes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
