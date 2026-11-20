import type { TopicDetailApproval, TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { resolveApprovedAt } from "@/app/knowledgeBase/topicDetail/topicDetailApprovalLogic";
import { isApproved } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

// What may change a document, as pure functions of plain data. Each `check...` returns the reason the
// action is refused, or null when it is allowed, so the server can refuse with the message and the
// UI can disable the button with the same words.

export function cleanCommentText(text: string | undefined): string {
  return (text ?? "").trim();
}

/** Whether saving would only repeat the head. Topics are not compared: they are the document's identity. */
export function isSameContent({
  head,
  title,
  contentHtml,
}: {
  head: Pick<TopicDetailDoc, "title" | "contentHtml">;
  title: string;
  contentHtml: string;
}): boolean {
  return head.title === title && head.contentHtml === contentHtml;
}

/** MongoDB's duplicate key error. Here it means another editor saved the same version number a moment earlier. */
export function isDuplicateVersionError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === 11000;
}

/**
 * Whether the editor's starting point is still the head. A save is a new version on top of the head,
 * so one made from an older version would silently throw away whatever was saved in between.
 * A document that was deleted while it was being edited can be saved again as a new document.
 */
export function checkBaseVersion({
  head,
  baseVersion,
}: {
  head: Pick<TopicDetailDoc, "version"> | null;
  baseVersion: number | null;
}): string | null {
  if (head === null) return null;
  if (baseVersion === null) return "A document for exactly these topics already exists. Open it from the list to edit it.";
  if (baseVersion !== head.version) {
    return `This document changed while you were editing it (it is now version ${head.version}). Reopen it to see the latest, then make your change again.`;
  }
  return null;
}

export type NewVersionRow = Omit<TopicDetailDoc, "createdAt" | "updatedAt">;

/**
 * The next version of a document. The editor approves their own save when they are an approver, and
 * if they are the only approver that completes the approval at once. With no approvers nothing is approved.
 */
export function buildNextVersion({
  detailKey,
  topicKeys,
  title,
  contentHtml,
  modifiedBy,
  head,
  approverUserNames,
  now,
}: {
  detailKey: string;
  topicKeys: string[];
  title: string;
  contentHtml: string;
  modifiedBy: string;
  head: Pick<TopicDetailDoc, "version"> | null;
  approverUserNames: string[];
  now: string;
}): NewVersionRow {
  const approvedBy = approverUserNames.includes(modifiedBy) ? [{ userName: modifiedBy, at: now }] : [];
  const approvedAt = resolveApprovedAt({ approval: { approvedAt: null, approvedBy }, approverUserNames, now });
  return {
    detailKey,
    version: (head?.version ?? 0) + 1,
    topicKeys,
    title,
    contentHtml,
    modifiedBy,
    approval: { approvedAt, approvedBy },
    comments: [],
  };
}

export function checkCanApprove({
  userName,
  approverUserNames,
  version,
  head,
}: {
  userName: string;
  approverUserNames: string[];
  version: number;
  head: Pick<TopicDetailDoc, "version" | "approval"> | null;
}): string | null {
  if (!approverUserNames.includes(userName)) return "You are not on the approver list.";
  if (head === null) return "That document no longer exists.";
  // Otherwise version 3 could be approved after its author has replaced it with version 4.
  if (head.version !== version) return "A newer version exists. Review the latest version instead.";
  if (isApproved(head)) return "This version is already approved.";
  if (head.approval.approvedBy.some((stamp) => stamp.userName === userName)) {
    return "You have already approved this version.";
  }
  return null;
}

/**
 * The approval after a withdrawal. Pulling a version that is live clears every stamp, so everyone has to
 * approve it again. Keeping the others' stamps would let the approver list shrinking later (the person who
 * pulled it leaving, say) complete it again and put a document that was pulled for wrong intel back to work.
 * Withdrawing from a pending version only takes back the caller's own stamp.
 */
export function applyWithdrawal({
  approval,
  userName,
}: {
  approval: TopicDetailApproval;
  userName: string;
}): TopicDetailApproval {
  if (approval.approvedAt !== null) return { approvedAt: null, approvedBy: [] };
  return { approvedAt: null, approvedBy: approval.approvedBy.filter((stamp) => stamp.userName !== userName) };
}

/**
 * An approver can take back their own approval from a pending version, or pull a version that is
 * approved (and so live) even if they never stamped it, so a document returning wrong intel can be
 * stopped by any approver.
 */
export function checkCanWithdraw({
  userName,
  approverUserNames,
  target,
}: {
  userName: string;
  approverUserNames: string[];
  target: Pick<TopicDetailDoc, "approval"> | null;
}): string | null {
  if (!approverUserNames.includes(userName)) return "You are not on the approver list.";
  if (target === null) return "That version does not exist.";
  const stampedByUser = target.approval.approvedBy.some((stamp) => stamp.userName === userName);
  if (!isApproved(target) && !stampedByUser) return "You have not approved this version, so there is nothing to withdraw.";
  return null;
}
