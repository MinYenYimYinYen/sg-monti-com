"use client";

import { useState } from "react";
import { Button } from "@/style/components/button";
import { DiffPopoverBody } from "@/app/knowledgeBase/diff/DiffPopoverBody";
import { pickDefaultComparison } from "@/app/knowledgeBase/diff/versionComparisonLogic";
import type { VersionComparison } from "@/app/knowledgeBase/diff/versionDiffTypes";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

type VersionComparisonViewProps = {
  detailKey: string;
  head: Pick<TopicDetailDoc, "version" | "title" | "contentHtml">;
  comparisons: VersionComparison[];
};

/**
 * The version picker and the diff against the picked version. It holds no container of its own, so the
 * compare dialog and the review expander can both host it. Mount it only while it is visible: the
 * versions are loaded when it mounts, so nothing is fetched for a reviewer who never looks.
 */
export function VersionComparisonView({ detailKey, head, comparisons }: VersionComparisonViewProps) {
  const [chosenVersion, setChosenVersion] = useState<number | null>(null);

  // A chosen version that is no longer offered (after an approval, say) falls back to the default.
  const selected =
    comparisons.find((comparison) => comparison.olderVersion === chosenVersion) ?? pickDefaultComparison(comparisons);
  if (!selected) return null;

  return (
    <div className="space-y-3">
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
      <DiffPopoverBody detailKey={detailKey} head={head} olderVersion={selected.olderVersion} />
    </div>
  );
}
