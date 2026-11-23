"use client";

import { useSelector } from "react-redux";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { useTopicDetailHistory } from "@/app/knowledgeBase/topicDetail/useTopicDetailHistory";
import { DiffViewer } from "@/app/knowledgeBase/diff/DiffViewer";
import { diffHtml } from "@/app/knowledgeBase/diff/htmlDiff";
import { diffTitles } from "@/app/knowledgeBase/diff/titleDiffLogic";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

type DiffPopoverBodyProps = {
  detailKey: string;
  head: Pick<TopicDetailDoc, "version" | "title" | "contentHtml">;
  olderVersion: number;
};

/**
 * The comparison itself. It is mounted only while the popover is open, because that is when the
 * versions are loaded: nothing is fetched for a reviewer who never looks.
 */
export function DiffPopoverBody({ detailKey, head, olderVersion }: DiffPopoverBodyProps) {
  useTopicDetailHistory(detailKey);
  const versions = useSelector(topicDetailSelect.historyByDetailKey)[detailKey];

  if (!versions) return <p className="text-xs italic text-muted-foreground">Loading versions...</p>;

  const older = versions.find((version) => version.version === olderVersion);
  if (!older) return <p className="text-xs italic text-muted-foreground">That version could not be found.</p>;

  const titleChange = diffTitles({ oldTitle: older.title, newTitle: head.title });
  const { changes } = diffHtml({ oldHtml: older.contentHtml, newHtml: head.contentHtml });
  const hasBodyChanges = changes.length > 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Changes from version {older.version} to version {head.version}.{" "}
        <span className="rounded-sm bg-accent/20 px-1 text-foreground">Added</span>{" "}
        <span className="rounded-sm bg-destructive/20 px-1 text-muted-foreground line-through">Removed</span>
      </p>

      {titleChange && (
        <p className="text-sm text-foreground">
          <span className="font-medium">Title: </span>
          <span className="rounded-sm bg-destructive/20 px-1 text-muted-foreground line-through">
            {titleChange.oldTitle}
          </span>{" "}
          <span className="rounded-sm bg-accent/20 px-1">{titleChange.newTitle}</span>
        </p>
      )}

      {hasBodyChanges ? (
        <DiffViewer
          key={`${detailKey}|${older.version}|${head.version}`}
          oldHtml={older.contentHtml}
          newHtml={head.contentHtml}
        />
      ) : (
        <p className="text-sm italic text-muted-foreground">
          {titleChange ? "The body is the same." : "No differences between these versions."}
        </p>
      )}
    </div>
  );
}
