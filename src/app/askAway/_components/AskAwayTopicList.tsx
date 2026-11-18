"use client";

import { useSelector } from "react-redux";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { cn } from "@/style/utils";

/** Every topic, with the ones Claude has marked as relevant to this conversation highlighted. */
export function AskAwayTopicList() {
  const topics = useSelector(knowledgeBaseSelect.topics);
  const currentTopicKeySet = useSelector(askAwaySelect.currentTopicKeySet);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <h2 className="shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topics</h2>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {topics.length === 0 && <p className="px-1 py-2 text-xs italic text-muted-foreground">No topics yet.</p>}
        {topics.map((topic) => {
          const isMarked = currentTopicKeySet.has(topic.topicKey);
          return (
            <div
              key={topic.topicKey}
              className={cn(
                "rounded-md border px-3 py-2 text-sm transition-colors",
                isMarked ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground",
              )}
            >
              <div className="truncate font-medium">{topic.name}</div>
              <div className="truncate text-xs text-muted-foreground">{topic.topicKey}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
