"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Notice } from "@/app/permission/_components/Notice";
import { PendingApprovalsList } from "@/components/navBar/notifications/PendingApprovalsList";
import { TopicDetailReviewDialog } from "@/app/knowledgeBase/editor/_components/TopicDetailReviewDialog";
import { knowledgeBaseSettingsSelect } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSelect";

/**
 * The documents waiting on the signed-in user. Each can be reviewed in a dialog, which shows what
 * changed and holds Approve and the comments, or opened in the workspace editor.
 */
export function ApprovalsPanel() {
  const userName = useSelector(authSelect.user)?.userName ?? null;
  const approverUserNames = useSelector(knowledgeBaseSettingsSelect.approverUserNames);
  // Held here, not in the list: the dialog must outlive a document leaving the list once it is approved.
  const [reviewDetailKey, setReviewDetailKey] = useState<string | null>(null);

  const isApprover = userName !== null && approverUserNames.includes(userName);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Waiting for your approval</h2>
          <p className="text-xs text-muted-foreground">
            The longest-waiting document is first. Until a version is approved, the AI keeps using the last approved
            one.
          </p>
        </div>

        {!isApprover && (
          <Notice tone="warning">
            You are not an approver, so nothing can be waiting on you. Approvers are chosen on the Settings tab.
          </Notice>
        )}

        <PendingApprovalsList onReviewAction={setReviewDetailKey} showOpenInEditor />
      </div>

      <TopicDetailReviewDialog detailKey={reviewDetailKey} onCloseAction={() => setReviewDetailKey(null)} />
    </div>
  );
}
