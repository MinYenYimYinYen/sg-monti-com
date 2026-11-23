"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Check, Circle } from "lucide-react";
import { authSelect } from "@/app/auth/authSlice";
import { Notice } from "@/app/permission/_components/Notice";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { DiffPopover } from "@/app/knowledgeBase/diff/DiffPopover";
import { TopicDetailCommentThread } from "@/app/knowledgeBase/editor/_components/TopicDetailCommentThread";
import { TopicDetailHistory } from "@/app/knowledgeBase/editor/_components/TopicDetailHistory";
import { knowledgeBaseSettingsSelect } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSelect";
import { useTopicDetailReview } from "@/app/knowledgeBase/topicDetail/useTopicDetailReview";
import { formatVersionTime } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

/**
 * Where a document stands: whether the head is approved, who has and has not approved it, which
 * version the AI is reading, and the conversation about it. The server decides who may do what; the
 * buttons only hide what would be refused.
 */
export function TopicDetailApprovalPanel({ detailKey }: { detailKey: string }) {
  const detail = useSelector(knowledgeBaseSelect.details).find((candidate) => candidate.detailKey === detailKey);
  const userName = useSelector(authSelect.user)?.userName ?? null;
  const approverUserNames = useSelector(knowledgeBaseSettingsSelect.approverUserNames);
  const { approve, withdrawApproval } = useTopicDetailReview();
  const [showHistory, setShowHistory] = useState(false);

  if (!detail) return null;

  const { version, status, approvalStates, liveVersion } = detail;
  const isApprover = userName !== null && approverUserNames.includes(userName);
  const hasApprovedHead = approvalStates.some((state) => state.userName === userName && state.approvedAt !== null);
  const canApprove = isApprover && status === "pending" && !hasApprovedHead;
  const canWithdrawHead = isApprover && (status === "approved" || hasApprovedHead);
  // The version the AI reads differs from the head while the head is waiting. Any approver can pull it.
  const olderLiveVersion = liveVersion !== null && liveVersion !== version ? liveVersion : null;

  return (
    <section className="space-y-3 rounded-md border border-border bg-primary/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Version {version}</h3>
        <Badge variant={status === "approved" ? "accent" : "secondary"} intensity="soft">
          {status === "approved" ? "Approved" : "Waiting for approval"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          saved by {detail.modifiedBy}, {formatVersionTime(detail.createdAt)}
        </span>
        <DiffPopover detailKey={detailKey} />
      </div>

      <p className="text-xs text-muted-foreground">
        {liveVersion === null
          ? "No version has been approved, so the AI does not use this document yet."
          : olderLiveVersion !== null
            ? `The AI is using version ${olderLiveVersion}, the last approved version.`
            : "The AI is using this version."}
      </p>

      {approverUserNames.length === 0 && (
        <Notice tone="warning">
          There are no approvers, so no new version can be approved. Add them on the Settings tab.
        </Notice>
      )}

      {approvalStates.length > 0 && (
        <ul className="space-y-1 text-sm">
          {approvalStates.map((state) => (
            <li key={state.userName} className="flex items-center gap-2">
              {state.approvedAt ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={cn("text-foreground", !state.isCurrentApprover && "text-muted-foreground")}>
                {state.userName}
              </span>
              <span className="text-xs text-muted-foreground">
                {state.approvedAt ? `approved ${formatVersionTime(state.approvedAt)}` : "has not approved yet"}
                {!state.isCurrentApprover && " (no longer an approver)"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <Button size="sm" onClick={() => approve({ detailKey, version })}>
            Approve version {version}
          </Button>
        )}
        {canWithdrawHead && (
          <Button size="sm" variant="outline" onClick={() => withdrawApproval({ detailKey, version })}>
            {status === "approved" ? `Pull version ${version} approval` : "Withdraw my approval"}
          </Button>
        )}
        {isApprover && olderLiveVersion !== null && (
          <Button
            size="sm"
            variant="destructive"
            intensity="soft"
            onClick={() => withdrawApproval({ detailKey, version: olderLiveVersion })}
          >
            Pull version {olderLiveVersion} approval
          </Button>
        )}
      </div>

      <TopicDetailCommentThread
        key={`${detailKey}|${version}`}
        detailKey={detailKey}
        version={version}
        comments={detail.comments}
      />

      <div className="space-y-2 border-t border-border pt-3">
        <Button size="sm" variant="primary" intensity="ghost" onClick={() => setShowHistory((shown) => !shown)}>
          {showHistory ? "Hide earlier versions" : "Show all versions"}
        </Button>
        {showHistory && <TopicDetailHistory detailKey={detailKey} />}
      </div>
    </section>
  );
}
