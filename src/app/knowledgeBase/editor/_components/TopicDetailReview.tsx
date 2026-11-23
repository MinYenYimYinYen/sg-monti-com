"use client";

import { useSelector } from "react-redux";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { DiffExpander } from "@/app/knowledgeBase/diff/DiffExpander";
import { TopicDetailApprovalPanel } from "@/app/knowledgeBase/editor/_components/TopicDetailApprovalPanel";
import { TopicDetailBodyViewer } from "@/app/knowledgeBase/editor/_components/TopicDetailBodyViewer";
import { TopicKeyBadges } from "@/app/knowledgeBase/editor/_components/TopicKeyBadges";

/**
 * Everything a reviewer needs for one document, with no draft behind it: the topics, the head's body
 * read only, then the approval panel, which holds Approve and the comment thread. Read from the store
 * by key, so it follows the document as it is approved or someone saves a newer version.
 */
export function TopicDetailReview({ detailKey }: { detailKey: string }) {
  const detail = useSelector(knowledgeBaseSelect.details).find((candidate) => candidate.detailKey === detailKey);

  if (!detail) return <p className="text-sm text-muted-foreground">This document is no longer available.</p>;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{detail.title}</h3>
        <TopicKeyBadges topicKeys={detail.topicKeys} />
      </div>
      <TopicDetailBodyViewer key={`${detail.detailKey}|${detail.version}`} html={detail.contentHtml} />
      <DiffExpander detailKey={detailKey} />
      <TopicDetailApprovalPanel detailKey={detailKey} showCompare={false} />
    </div>
  );
}
