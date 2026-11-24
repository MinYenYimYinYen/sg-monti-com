"use client";

import { useSelector } from "react-redux";
import { GitCompare } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/style/components/accordion";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { VersionComparisonView } from "@/app/knowledgeBase/diff/VersionComparisonView";
import { listVersionComparisons } from "@/app/knowledgeBase/diff/versionComparisonLogic";

/**
 * The comparison of a document's head with an older version, inline. Renders nothing when there is no
 * older version to compare with. Collapsed until opened unless `defaultOpen`, for a reader who came to
 * review the changes. Closed content is unmounted, so the versions are only loaded once it is open.
 */
export function DiffExpander({ detailKey, defaultOpen = false }: { detailKey: string; defaultOpen?: boolean }) {
  const detail = useSelector(knowledgeBaseSelect.details).find((candidate) => candidate.detailKey === detailKey);

  if (!detail) return null;

  const comparisons = listVersionComparisons({ headVersion: detail.version, liveVersion: detail.liveVersion });
  if (comparisons.length === 0) return null;

  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? "changes" : undefined}>
      <AccordionItem value="changes" className="rounded-md border border-border bg-card px-3">
        <AccordionTrigger className="py-2">
          <span className="flex items-center gap-1">
            <GitCompare className="h-4 w-4" />
            Changes in version {detail.version}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <VersionComparisonView
            key={`${detailKey}|${detail.version}`}
            detailKey={detailKey}
            head={detail}
            comparisons={comparisons}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
