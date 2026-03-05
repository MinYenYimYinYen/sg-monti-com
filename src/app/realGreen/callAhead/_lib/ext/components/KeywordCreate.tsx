"use client";

import { Input } from "@/style/components/input";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { useSelector } from "react-redux";
import { keywordSelect } from "@/app/realGreen/callAhead/selectors/keywordSelect";
import { useMemo, useState } from "react";

export function KeywordCreate() {
  const { upsertKeyword } = useCallAhead({ autoLoad: false });
  const keywordMap = useSelector(keywordSelect.keywordMap);

  const [keywordId, setKeywordId] = useState("");
  const [message, setMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const canSave = useMemo(() => {
    const validLength = keywordId.trim().length > 0 && message.trim().length > 0;
    const notExists = keywordMap.get(keywordId) === undefined;
    return validLength && notExists;
  }, [keywordMap, keywordId, message]);

  const handleSave = async () => {
    if (!canSave) return;

    setSaveStatus("saving");
    try {
      upsertKeyword(keywordId.trim(), message.trim());
      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("idle");
      console.error("Failed to create keyword:", error);
    }
  };

  const handleSuccessComplete = () => {
    setKeywordId("");
    setMessage("");
    setSaveStatus("idle");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Keyword ID"
        value={keywordId}
        onChange={(e) => setKeywordId(e.target.value)}
        disabled={saveStatus === "saving" || saveStatus === "success"}
        className="w-48"
      />
      <Input
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={saveStatus === "saving" || saveStatus === "success"}
        className="flex-1"
      />
      <SaveButton
        status={saveStatus}
        onClick={handleSave}
        disabled={!canSave}
        onSuccessComplete={handleSuccessComplete}
      >
        Create
      </SaveButton>
    </div>
  );
}
