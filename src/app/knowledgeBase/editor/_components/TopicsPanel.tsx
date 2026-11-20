"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { UnsavedChangesDialog } from "@/components/EntityFileControls/UnsavedChangesDialog";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { TopicForm } from "@/app/knowledgeBase/editor/_components/TopicForm";
import type { Topic } from "@/app/knowledgeBase/editor/knowledgeBaseTypes";

type PendingChange = { kind: "new" } | { kind: "open"; topic: Topic };

/** The Topics tab: the list on the left, the open topic on the right. */
export function TopicsPanel() {
  const topics = useSelector(knowledgeBaseSelect.topicsByCoverage);
  const draft = useSelector(topicEditorSelect.topicDraft);
  const activeName = useSelector(topicEditorSelect.topicActiveName);
  const isDirty = useSelector(topicEditorSelect.topicIsDirty);
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeTopics.write);
  const { startNewTopic, openTopic } = useTopicEditor();
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const applyChange = (change: PendingChange) => {
    if (change.kind === "new") startNewTopic();
    else openTopic(change.topic);
  };

  // The File menu guards its own New. Clicks on the list and its button need the same guard.
  const requestChange = (change: PendingChange) => {
    const isAlreadyOpen = change.kind === "open" && draft && !draft.isNew && draft.topicKey === change.topic.topicKey;
    if (isAlreadyOpen) return;
    if (isDirty) {
      setPendingChange(change);
      return;
    }
    applyChange(change);
  };

  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      <div className="flex w-[320px] shrink-0 flex-col gap-2 min-h-0">
        <Button
          variant="primary"
          intensity="soft"
          className="w-full justify-start gap-2"
          disabled={!canWrite}
          onClick={() => requestChange({ kind: "new" })}
        >
          <Plus className="h-4 w-4" />
          New topic
        </Button>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {topics.length === 0 && (
            <p className="px-1 py-2 text-xs italic text-muted-foreground">No topics yet.</p>
          )}
          {topics.map((topic) => {
            const isSelected = draft !== null && !draft.isNew && draft.topicKey === topic.topicKey;
            const documentCount = topic.documents.length;
            const hasNoDocuments = documentCount === 0;
            return (
              <button
                key={topic.topicKey}
                type="button"
                onClick={() => requestChange({ kind: "open", topic })}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  isSelected && "border-primary bg-primary/10 text-primary",
                  !isSelected && "border-border text-foreground",
                  !isSelected && hasNoDocuments && "bg-secondary/20 hover:bg-secondary/30",
                  !isSelected && !hasNoDocuments && "bg-card hover:bg-accent/10",
                )}
              >
                <div className="truncate font-medium">{topic.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {topic.topicKey} · {documentCount} {documentCount === 1 ? "document" : "documents"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-full min-w-0 flex-1 overflow-y-auto">
        {draft ? (
          <TopicForm />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a topic to edit, or add a new one.
          </div>
        )}
      </div>

      <UnsavedChangesDialog
        open={pendingChange !== null}
        entityName={activeName}
        onCancelAction={() => setPendingChange(null)}
        onDiscardAction={() => {
          if (pendingChange) applyChange(pendingChange);
          setPendingChange(null);
        }}
      />
    </div>
  );
}
