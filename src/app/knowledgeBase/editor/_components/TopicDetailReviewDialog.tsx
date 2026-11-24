"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/style/components/dialog";
import { TopicDetailReview } from "@/app/knowledgeBase/editor/_components/TopicDetailReview";
import { OpenInWorkspaceButton } from "@/app/knowledgeBase/workspace/_components/OpenInWorkspaceButton";

/**
 * Review one document without leaving the page: read it and what changed, comment, approve, or open it
 * in the workspace editor.
 */
export function TopicDetailReviewDialog({
  detailKey,
  onCloseAction,
}: {
  /** The document under review, or null while the dialog is closed. */
  detailKey: string | null;
  onCloseAction: () => void;
}) {
  return (
    <Dialog open={detailKey !== null} onOpenChange={(open) => !open && onCloseAction()}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Review document</DialogTitle>
          <DialogDescription>Read what changed, leave a comment, or approve the latest version.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {detailKey && <TopicDetailReview detailKey={detailKey} diffDefaultOpen />}
        </div>
        {detailKey && (
          <div className="flex justify-end">
            <OpenInWorkspaceButton detailKey={detailKey} onOpenedAction={onCloseAction} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
