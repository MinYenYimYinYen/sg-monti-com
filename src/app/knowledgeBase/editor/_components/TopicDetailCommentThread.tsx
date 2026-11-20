"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
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
  const currentUserName = useSelector(authSelect.user)?.userName ?? null;
  const [text, setText] = useState("");

  // The box is cleared before the request, not after: with Enter as a shortcut, a second press while the
  // first is in flight would otherwise post the same comment twice. A failed send shows the thunk's toast.
  const handleSend = () => {
    if (text.trim() === "") return;
    const textToSend = text;
    setText("");
    comment({ detailKey, version, text: textToSend });
  };

  return (
    <div className="space-y-2">
      {/* Dark so the history reads as a record; the white textarea below is the only place to type. */}
      <div className="space-y-2 rounded-md bg-foreground p-3 text-background">
        <h4 className="text-xs font-semibold uppercase tracking-wide opacity-70">Discussion on version {version}</h4>
        {comments.length === 0 && <p className="text-xs italic opacity-70">No comments yet.</p>}
        <div className="flex flex-col gap-2">
          {comments.map((threadComment) => {
            const isMine = threadComment.userName === currentUserName;
            return (
              <div
                key={`${threadComment.userName}|${threadComment.at}`}
                className={cn(
                  "max-w-[80%] rounded-lg p-2 text-sm",
                  isMine ? "self-end bg-primary text-primary-foreground" : "self-start bg-background/15 text-background",
                )}
              >
                <div className="text-xs opacity-70">
                  {isMine ? "" : `${threadComment.userName}, `}
                  {formatVersionTime(threadComment.at)}
                </div>
                <div className="whitespace-pre-wrap">{threadComment.text}</div>
              </div>
            );
          })}
        </div>
      </div>
      <textarea
        className={cn(TEXTAREA_CLASS_NAME, "min-h-[56px]")}
        maxLength={MAX_COMMENT_CHARS}
        value={text}
        placeholder="Leave a comment. Enter sends, Shift+Enter adds a line. It does not approve or reject anything."
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // isComposing: Enter also confirms an IME candidate, which must not send the comment.
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            handleSend();
          }
        }}
      />
      <Button size="sm" variant="outline" disabled={text.trim() === ""} onClick={handleSend}>
        Add comment
      </Button>
    </div>
  );
}
