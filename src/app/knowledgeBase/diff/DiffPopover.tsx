"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { GitCompare } from "lucide-react";
import { Button } from "@/style/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/style/components/dialog";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { DiffPopoverBody } from "@/app/knowledgeBase/diff/DiffPopoverBody";
import { listVersionComparisons, pickDefaultComparison } from "@/app/knowledgeBase/diff/versionComparisonLogic";

/**
 * Compare the head of a document with its previous version, the approved one the AI reads, or both
 * when they are different versions. Renders nothing when there is no older version to compare with.
 *
 * Shown in a centered dialog rather than a popover anchored to the button: the diff is tall, and an
 * anchored popover had no room above or below the button, so its top ended up off-screen.
 */
export function DiffPopover({ detailKey }: { detailKey: string }) {
  const detail = useSelector(knowledgeBaseSelect.details).find((candidate) => candidate.detailKey === detailKey);
  const [chosenVersion, setChosenVersion] = useState<number | null>(null);

  if (!detail) return null;

  const comparisons = listVersionComparisons({ headVersion: detail.version, liveVersion: detail.liveVersion });
  if (comparisons.length === 0) return null;

  // A chosen version that is no longer offered (after an approval, say) falls back to the default.
  const selected =
    comparisons.find((comparison) => comparison.olderVersion === chosenVersion) ?? pickDefaultComparison(comparisons);
  if (!selected) return null;

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
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {comparisons.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {comparisons.map((comparison) => (
                <Button
                  key={comparison.olderVersion}
                  size="sm"
                  variant="primary"
                  intensity={comparison.olderVersion === selected.olderVersion ? "soft" : "ghost"}
                  onClick={() => setChosenVersion(comparison.olderVersion)}
                >
                  {comparison.label}
                </Button>
              ))}
            </div>
          )}
          {comparisons.length === 1 && <p className="text-sm font-medium text-foreground">{selected.label}</p>}
          <DiffPopoverBody detailKey={detailKey} head={detail} olderVersion={selected.olderVersion} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
