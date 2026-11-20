"use client";

import { useSelector } from "react-redux";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { Button } from "@/style/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { TopicDetailForm } from "@/app/knowledgeBase/editor/_components/TopicDetailForm";
import { topicEditorSelect } from "@/app/knowledgeBase/editor/topicEditorSelect";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";

/**
 * Edits the document held in the Documents tab's draft, without leaving the page. It shares that draft
 * on purpose: opening a document here replaces an unsaved one there, as it would on that tab, and
 * closing without saving leaves the draft where it is for the rest of the session. The caller opens the
 * draft (`openTopicDetail`) before showing this.
 */
export function TopicDetailQuickEditDialog({ open, onCloseAction }: { open: boolean; onCloseAction: () => void }) {
  const draft = useSelector(topicEditorSelect.detailDraft);
  const isDirty = useSelector(topicEditorSelect.detailIsDirty);
  const canSaveDraft = useSelector(topicEditorSelect.detailCanSave);
  const canWrite = useSelector(userCapabilitiesSelect.allows)(can.knowledgeTopics.write);
  const { saveTopicDetail } = useTopicEditor();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCloseAction()}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Saving makes a new version. The AI keeps using the last approved version until the new one is approved.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <TopicDetailForm />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button size="sm" variant="outline" onClick={onCloseAction}>
            Close
          </Button>
          <Button
            size="sm"
            disabled={!draft || !canWrite || !isDirty || !canSaveDraft}
            onClick={() => draft && saveTopicDetail(draft)}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
