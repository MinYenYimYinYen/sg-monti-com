"use client";

import { useSelector } from "react-redux";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { useKnowledgeBaseDeps } from "@/app/knowledgeBase/editor/useKnowledgeBaseDeps";

/** Whether the user may read everything the approvals list is built from. Same two reads as the knowledge base layout. */
export function useCanSeeKnowledgeBaseApprovals() {
  const allows = useSelector(userCapabilitiesSelect.allows);
  return allows(can.knowledgeTopics.read) && allows(can.knowledgeSettings.read);
}

function LoadKnowledgeBaseDeps() {
  useKnowledgeBaseDeps();
  return null;
}

// Mounted outside the popover content, which unmounts when closed, so the count on the inbox button
// stays current. The deps hook is only ever called for a user who holds both reads.
export function KnowledgeBaseApprovalsLoader() {
  return useCanSeeKnowledgeBaseApprovals() ? <LoadKnowledgeBaseDeps /> : null;
}
