"use client";

import { useState } from "react";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";
import { MAX_COMMENT_CHARS } from "@/app/knowledgeBase/knowledgeBaseConst";
import { TEXTAREA_CLASS_NAME } from "@/app/knowledgeBase/editor/_components/editorFieldStyles";
import { useTopicDetailReview } from "@/app/knowledgeBase/topicDetail/useTopicDetailReview";
import { formatVersionTime } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";
import type { TopicDetailComment } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

/**
 * The conversation about one version. A comment never approves or rejects anything: a reviewer who
 * disagrees simply does not approve, and says why here. The parent keys this on the version, so the
 * draft text does not follow the reader to another version.
 */
export function TopicDetailCommentThread({
  detailKey,
  version,
  comments,
}: {
  detailKey: string;
  version: number;
  comments: TopicDetailComment[];
}) {
  const { comment } = useTopicDetailReview();
  const [text, setText] = useState("");

  const handleSend = async () => {
    await comment({ detailKey, version, text });
    setText("");
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Discussion on version {version}
      </h4>
      {comments.length === 0 && <p className="text-xs italic text-muted-foreground">No comments yet.</p>}
      {comments.map((entry) => (
        <div key={`${entry.userName}|${entry.at}`} className="rounded-md bg-accent/10 p-2 text-sm">
          <div className="text-xs text-muted-foreground">
            {entry.userName}, {formatVersionTime(entry.at)}
          </div>
          <div className="whitespace-pre-wrap text-foreground">{entry.text}</div>
        </div>
      ))}
      <textarea
        className={cn(TEXTAREA_CLASS_NAME, "min-h-[56px]")}
        maxLength={MAX_COMMENT_CHARS}
        value={text}
        placeholder="Leave a comment. It does not approve or reject anything."
        onChange={(event) => setText(event.target.value)}
      />
      <Button size="sm" variant="outline" disabled={text.trim() === ""} onClick={handleSend}>
        Add comment
      </Button>
    </div>
  );
}
