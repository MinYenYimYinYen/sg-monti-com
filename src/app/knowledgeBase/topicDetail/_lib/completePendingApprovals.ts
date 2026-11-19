import { TopicDetailVersionModel } from "@/app/knowledgeBase/topicDetail/TopicDetailVersionModel";
import { resolveApprovedAt } from "@/app/knowledgeBase/topicDetail/topicDetailApprovalLogic";
import { loadHeadDocs } from "@/app/knowledgeBase/topicDetail/_lib/topicDetailQueries";
import { isApproved } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

/**
 * Approves the pending versions that the approver list now allows. Run whenever the list shrinks or a
 * user is deleted: removing the last approver a version was waiting for completes it. Only a head can
 * complete, since a pending version that has been replaced is dead. A version that is already approved
 * is never touched, and an empty list approves nothing. Server only; the caller has already connected.
 */
export async function completePendingApprovals({
  approverUserNames,
}: {
  approverUserNames: string[];
}): Promise<number> {
  if (approverUserNames.length === 0) return 0;

  const heads = await loadHeadDocs();
  const now = new Date().toISOString();
  let completedCount = 0;

  for (const head of heads) {
    if (isApproved(head)) continue;
    const approvedAt = resolveApprovedAt({ approval: head.approval, approverUserNames, now });
    if (approvedAt === null) continue;
    // Matching on `approvedAt: null` keeps a version someone approved meanwhile from being stamped twice.
    const result = await TopicDetailVersionModel.updateOne(
      { detailKey: head.detailKey, version: head.version, "approval.approvedAt": null },
      { $set: { "approval.approvedAt": approvedAt } },
    );
    completedCount += result.modifiedCount;
  }
  return completedCount;
}
