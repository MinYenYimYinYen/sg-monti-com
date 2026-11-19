"use client";

import { useSelector } from "react-redux";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { ApproversSection } from "@/app/knowledgeBase/knowledgeBaseSettings/_components/ApproversSection";
import { AskAwayPromptSection } from "@/app/knowledgeBase/knowledgeBaseSettings/_components/AskAwayPromptSection";

/** The Settings tab. The knowledge base layout loads the settings and holds the gate. */
export function KnowledgeBaseSettingsPanel() {
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeSettings.write);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <ApproversSection canWrite={canWrite} />
        <AskAwayPromptSection canWrite={canWrite} />
      </div>
    </div>
  );
}
