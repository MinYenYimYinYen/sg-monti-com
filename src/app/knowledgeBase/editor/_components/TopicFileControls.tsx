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
 * File menu for the Topics tab. There is no Open (the list is on screen) and no Save As: a topic is
 * identified by its key, not a name.
 */
export function TopicFileControls() {
  const draft = useSelector(topicEditorSelect.topicDraft);
  const activeName = useSelector(topicEditorSelect.topicActiveName);
  const isDirty = useSelector(topicEditorSelect.topicIsDirty);
  const canSaveDraft = useSelector(topicEditorSelect.topicCanSave);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.knowledgeTopics.write);
  const canDelete = allows(can.knowledgeTopics.delete);
  const { startNewTopic, saveTopic, deleteTopic } = useTopicEditor();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSave = () => {
    if (draft) saveTopic(draft);
  };

  const handleDelete = async () => {
    if (!draft || draft.isNew) return;
    await deleteTopic(draft.topicKey);
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
        onNewAction={startNewTopic}
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
            <DialogTitle>Delete topic?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{draft?.name || draft?.topicKey}&rdquo;. A topic that documents are still
              tagged with cannot be deleted; the error will name them.
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
