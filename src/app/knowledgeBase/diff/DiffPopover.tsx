"use client";

import { useSelector } from "react-redux";
import { GitCompare } from "lucide-react";
import { Button } from "@/style/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/style/components/dialog";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { VersionComparisonView } from "@/app/knowledgeBase/diff/VersionComparisonView";
import { listVersionComparisons } from "@/app/knowledgeBase/diff/versionComparisonLogic";

/**
 * Compare the head of a document with its previous version, the approved one the AI reads, or both
 * when they are different versions. Renders nothing when there is no older version to compare with.
 *
 * Shown in a centered dialog rather than a popover anchored to the button: the diff is tall, and an
 * anchored popover had no room above or below the button, so its top ended up off-screen.
 */
export function DiffPopover({ detailKey }: { detailKey: string }) {
  const detail = useSelector(knowledgeBaseSelect.details).find((candidate) => candidate.detailKey === detailKey);

  if (!detail) return null;

  const comparisons = listVersionComparisons({ headVersion: detail.version, liveVersion: detail.liveVersion });
  if (comparisons.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="primary" intensity="ghost" className="gap-1">
          <GitCompare className="h-4 w-4" />
          Compare
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] w-[40rem] max-w-[90vw] flex-col gap-3 p-4"
      >
        <DialogHeader className="pr-6">
          <DialogTitle className="text-base">Compare versions</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VersionComparisonView detailKey={detailKey} head={detail} comparisons={comparisons} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
