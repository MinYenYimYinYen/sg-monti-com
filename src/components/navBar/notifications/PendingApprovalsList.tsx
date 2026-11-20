"use client";

import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { TopicKeyBadges } from "@/app/knowledgeBase/editor/_components/TopicKeyBadges";
import { formatVersionTime } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

// Knowledge base documents whose latest version is waiting on the signed-in user. Approving happens
// in the review dialog, after reading the document, never from this list.
export function PendingApprovalsList({
  onReviewAction,
}: {
  onReviewAction: (detailKey: string) => void;
}) {
  const details = useSelector(knowledgeBaseSelect.detailsPendingMyApproval);

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
          <Button
            size="sm"
            variant="primary"
            intensity="soft"
            className="h-7 text-xs"
            onClick={() => onReviewAction(detail.detailKey)}
          >
            Review
          </Button>
        </li>
      ))}
    </ul>
  );
}
