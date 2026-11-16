"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { EntityFileControls } from "@/components/EntityFileControls/EntityFileControls";
import { DropdownMenuItem } from "@/style/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";

/**
 * File menu for the Documents tab. There is no Open (the list is on screen) and no Save As: a
 * document is identified by its topics, so a copy under a new name would be the same document.
 */
export function TopicDetailFileControls() {
  const draft = useSelector(topicEditorSelect.detailDraft);
  const detailKey = useSelector(topicEditorSelect.detailDraftKey);
  const activeName = useSelector(topicEditorSelect.detailActiveName);
  const isDirty = useSelector(topicEditorSelect.detailIsDirty);
  const canSaveDraft = useSelector(topicEditorSelect.detailCanSave);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.knowledgeTopics.write);
  const canDelete = allows(can.knowledgeTopics.delete);
  const { startNewTopicDetail, saveTopicDetail, deleteTopicDetail } = useTopicEditor();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSave = () => {
    if (draft) saveTopicDetail(draft);
  };

  const handleDelete = async () => {
    if (!draft || draft.isNew || !detailKey) return;
    await deleteTopicDetail(detailKey);
    setDeleteConfirmOpen(false);
  };

  return (
    <>
      <EntityFileControls
        activeName={activeName}
        isDirty={isDirty}
        canSave={canWrite && canSaveDraft}
        supportsMultiple={false}
        onSaveAction={handleSave}
        onNewAction={startNewTopicDetail}
        extraMenuItems={
          <DropdownMenuItem
            onSelect={() => setDeleteConfirmOpen(true)}
            disabled={!canDelete || !draft || draft.isNew}
            className="text-destructive focus:text-destructive"
          >
            Delete…
          </DropdownMenuItem>
        }
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{draft?.title}&rdquo;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" disabled={!canDelete} onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
