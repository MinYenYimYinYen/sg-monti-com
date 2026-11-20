"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/style/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/style/components/dialog";
import { TopicDetailReview } from "@/app/knowledgeBase/editor/_components/TopicDetailReview";

/** Review one document without leaving the page: read it, comment, approve, or jump to the Documents tab. */
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
          <DialogDescription>Read the latest version, leave a comment, or approve it.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {detailKey && <TopicDetailReview detailKey={detailKey} />}
        </div>
        <div className="flex justify-end">
          <Button asChild size="sm" variant="primary" intensity="ghost" className="gap-1">
            <Link href="/knowledgeBase/documents" onClick={onCloseAction}>
              Open in Documents
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
