"use client";

import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { useTopicDetailHistory } from "@/app/knowledgeBase/topicDetail/useTopicDetailHistory";
import { formatVersionTime } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

/**
 * Every version of one document, newest first. Mounted only while someone is looking back, because that
 * is when the history is loaded. The content of each version is held for the diff view that follows.
 */
export function TopicDetailHistory({ detailKey }: { detailKey: string }) {
  useTopicDetailHistory(detailKey);
  const versions = useSelector(topicDetailSelect.historyByDetailKey)[detailKey];

  if (!versions) return <p className="text-xs italic text-muted-foreground">Loading versions...</p>;

  return (
    <ul className="space-y-2">
      {versions.map((version) => (
        <li key={version.version} className="space-y-1 rounded-md border border-border bg-card p-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">Version {version.version}</span>
            <Badge
              variant={version.approval.approvedAt ? "accent" : "secondary"}
              intensity="soft"
              className="px-1.5 py-0"
            >
              {version.approval.approvedAt ? "Approved" : "Not approved"}
            </Badge>
            <span className="text-muted-foreground">
              saved by {version.modifiedBy}, {formatVersionTime(version.createdAt)}
            </span>
          </div>
          {version.approval.approvedBy.length > 0 && (
            <p className="text-muted-foreground">
              Approved by {version.approval.approvedBy.map((stamp) => stamp.userName).join(", ")}
            </p>
          )}
          {version.comments.map((comment) => (
            <p key={`${comment.userName}|${comment.at}`} className="text-foreground">
              <span className="font-medium">{comment.userName}:</span> {comment.text}
            </p>
          ))}
        </li>
      ))}
    </ul>
  );
}
