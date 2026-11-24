"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Pencil } from "lucide-react";
import { UnsavedChangesDialog } from "@/components/EntityFileControls/UnsavedChangesDialog";
import { Button } from "@/style/components/button";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { KNOWLEDGE_BASE_WORKSPACE_HREF } from "@/app/knowledgeBase/knowledgeBaseRoutes";
import { useKnowledgeBaseWorkspace } from "@/app/knowledgeBase/workspace/useKnowledgeBaseWorkspace";

type OpenInWorkspaceButtonProps = {
  detailKey: string;
  /** Called once the workspace has been opened, so a host dialog can close itself. */
  onOpenedAction?: () => void;
  className?: string;
};

/**
 * Sends one document to the workspace editor. The workspace's state is set first, then the page is
 * opened, so it arrives already showing the document. Opening replaces the editor's document draft, so
 * unsaved edits to a different document are asked about first.
 */
export function OpenInWorkspaceButton({ detailKey, onOpenedAction, className }: OpenInWorkspaceButtonProps) {
  const router = useRouter();
  const detail = useSelector(knowledgeBaseSelect.details).find((candidate) => candidate.detailKey === detailKey);
  const draft = useSelector(topicEditorSelect.detailDraft);
  const draftKey = useSelector(topicEditorSelect.detailDraftKey);
  const activeName = useSelector(topicEditorSelect.detailActiveName);
  const isDirty = useSelector(topicEditorSelect.detailIsDirty);
  const { openDetailInEditor, showDetailInEditor } = useKnowledgeBaseWorkspace();
  const [isAsking, setIsAsking] = useState(false);

  if (!detail) return null;

  const isAlreadyOpen = draft !== null && !draft.isNew && draftKey === detailKey;

  const goToEditor = () => {
    // The document is already in the draft, so its edits are kept rather than reloaded from the store.
    if (isAlreadyOpen) showDetailInEditor();
    else openDetailInEditor(detail);
    router.push(KNOWLEDGE_BASE_WORKSPACE_HREF);
    onOpenedAction?.();
  };

  const handleClick = () => {
    if (isDirty && !isAlreadyOpen) {
      setIsAsking(true);
      return;
    }
    goToEditor();
  };

  return (
    <>
      <Button size="sm" variant="primary" intensity="ghost" className={className} onClick={handleClick}>
        <Pencil className="h-3.5 w-3.5" />
        Open in editor
      </Button>
      <UnsavedChangesDialog
        open={isAsking}
        entityName={activeName}
        onCancelAction={() => setIsAsking(false)}
        onDiscardAction={() => {
          setIsAsking(false);
          goToEditor();
        }}
      />
    </>
  );
}
