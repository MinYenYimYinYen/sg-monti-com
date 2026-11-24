"use client";

import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { TopicKeyBadges } from "@/app/knowledgeBase/editor/_components/TopicKeyBadges";
import { formatVersionTime } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";
import { sortWaitingLongestFirst } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceLogic";
import { OpenInWorkspaceButton } from "@/app/knowledgeBase/workspace/_components/OpenInWorkspaceButton";

// Knowledge base documents whose latest version is waiting on the signed-in user, longest-waiting first.
// Approving happens in the review dialog, after reading the document, never from this list.
export function PendingApprovalsList({
  onReviewAction,
  showOpenInEditor = false,
}: {
  onReviewAction: (detailKey: string) => void;
  /** Adds a second way in, straight to the workspace editor, for hosts that have room for it. */
  showOpenInEditor?: boolean;
}) {
  const details = sortWaitingLongestFirst(useSelector(knowledgeBaseSelect.detailsPendingMyApproval));

  if (details.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No documents are waiting for your approval.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {details.map((detail) => (
        <li
          key={detail.detailKey}
          className="space-y-2 rounded-md border border-border bg-card p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {detail.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Version {detail.version} saved by {detail.modifiedBy},{" "}
              {formatVersionTime(detail.createdAt)}
            </p>
          </div>
          <TopicKeyBadges topicKeys={detail.topicKeys} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              intensity="soft"
              className="h-7 text-xs"
              onClick={() => onReviewAction(detail.detailKey)}
            >
              Review
            </Button>
            {showOpenInEditor && <OpenInWorkspaceButton detailKey={detail.detailKey} className="h-7 text-xs" />}
          </div>
        </li>
      ))}
    </ul>
  );
}
