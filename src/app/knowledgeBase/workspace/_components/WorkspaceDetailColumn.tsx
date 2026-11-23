"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { UnsavedChangesDialog } from "@/components/EntityFileControls/UnsavedChangesDialog";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";
import { TopicKeyBadges } from "@/app/knowledgeBase/editor/_components/TopicKeyBadges";
import { knowledgeBaseWorkspaceSelect } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceSelect";
import { useKnowledgeBaseWorkspace } from "@/app/knowledgeBase/workspace/useKnowledgeBaseWorkspace";
import type { TopicDetail } from "@/app/knowledgeBase/editor/knowledgeBaseTypes";

type PendingChange = { kind: "new" } | { kind: "open"; detail: TopicDetail };

/**
 * Column 2: the documents, general to specific. While a saved topic is open the list follows it, so
 * picking a topic shows its documents; the toggle widens it to every document.
 */
export function WorkspaceDetailColumn() {
  const details = useSelector(knowledgeBaseWorkspaceSelect.detailsForList);
  const listScope = useSelector(knowledgeBaseWorkspaceSelect.detailListScope);
  const listTopicKey = useSelector(knowledgeBaseWorkspaceSelect.detailListTopicKey);
  const topicDraft = useSelector(topicEditorSelect.topicDraft);
  const draft = useSelector(topicEditorSelect.detailDraft);
  const draftKey = useSelector(topicEditorSelect.detailDraftKey);
  const activeName = useSelector(topicEditorSelect.detailActiveName);
  const isDirty = useSelector(topicEditorSelect.detailIsDirty);
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeTopics.write);
  const { startNewTopicDetail, openTopicDetail } = useTopicEditor();
  const { setDetailListScope } = useKnowledgeBaseWorkspace();
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const hasSavedTopicOpen = topicDraft !== null && !topicDraft.isNew;

  const applyChange = (change: PendingChange) => {
    if (change.kind === "new") startNewTopicDetail();
    else openTopicDetail(change.detail);
  };

  // The File menu guards its own New. Clicks on the list and its button need the same guard.
  const requestChange = (change: PendingChange) => {
    const isAlreadyOpen = change.kind === "open" && draft && !draft.isNew && draftKey === change.detail.detailKey;
    if (isAlreadyOpen) return;
    if (isDirty) {
      setPendingChange(change);
      return;
    }
    applyChange(change);
  };

  return (
    <div className="flex w-[300px] shrink-0 flex-col gap-2 min-h-0">
      <Button
        variant="primary"
        intensity="soft"
        className="w-full justify-start gap-2"
        disabled={!canWrite}
        onClick={() => requestChange({ kind: "new" })}
      >
        <Plus className="h-4 w-4" />
        New document
      </Button>

      {hasSavedTopicOpen && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="primary"
            intensity={listScope === "openTopic" ? "soft" : "ghost"}
            className="min-w-0 flex-1"
            onClick={() => setDetailListScope("openTopic")}
          >
            <span className="truncate">{topicDraft.topicKey}</span>
          </Button>
          <Button
            size="sm"
            variant="primary"
            intensity={listScope === "all" ? "soft" : "ghost"}
            className="flex-1"
            onClick={() => setDetailListScope("all")}
          >
            All documents
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {details.length === 0 && (
          <p className="px-1 py-2 text-xs italic text-muted-foreground">
            {listTopicKey ? `No documents are tagged with ${listTopicKey} yet.` : "No documents yet."}
          </p>
        )}
        {details.map((detail) => {
          const isSelected = draft !== null && !draft.isNew && draftKey === detail.detailKey;
          return (
            <button
              key={detail.detailKey}
              type="button"
              onClick={() => requestChange({ kind: "open", detail })}
              className={cn(
                "w-full space-y-1 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-accent/10",
              )}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate font-medium">{detail.title}</div>
                {detail.status === "pending" && (
                  <Badge variant="secondary" intensity="soft" className="shrink-0 px-1.5 py-0 font-medium">
                    Waiting
                  </Badge>
                )}
              </div>
              <TopicKeyBadges topicKeys={detail.topicKeys} />
            </button>
          );
        })}
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
