import type {
  TopicDetailApproval,
  TopicDetailApprovalStamp,
  TopicDetailDoc,
} from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { isApproved } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

// The approval rules, as pure functions of plain data. Nothing here reads a store, a database or the
// clock: `now` is passed in.
//
// The rule: a pending version becomes approved when every current approver has approved it, and an
// approved version stays approved whatever the approver list becomes. That stored `approvedAt` is the
// source of truth, never a recomputation, so changing who the approvers are can never take a live
// version away from the AI. An empty approver list never completes anything.

export type TopicDetailStatus = "approved" | "pending";

/** The current approvers who have not approved yet, in the approver list's order. */
export function pendingApproverUserNames({
  approverUserNames,
  approvedBy,
}: {
  approverUserNames: string[];
  approvedBy: TopicDetailApprovalStamp[];
}): string[] {
  const approvedUserNames = new Set(approvedBy.map((stamp) => stamp.userName));
  return approverUserNames.filter((userName) => !approvedUserNames.has(userName));
}

/** Stamps from people who are no longer approvers are ignored. */
export function isApprovalComplete({
  approverUserNames,
  approvedBy,
}: {
  approverUserNames: string[];
  approvedBy: TopicDetailApprovalStamp[];
}): boolean {
  return approverUserNames.length > 0 && pendingApproverUserNames({ approverUserNames, approvedBy }).length === 0;
}

/** The value `approvedAt` should have: kept if already set, otherwise `now` once the approvers are all in. */
export function resolveApprovedAt({
  approval,
  approverUserNames,
  now,
}: {
  approval: TopicDetailApproval;
  approverUserNames: string[];
  now: string;
}): string | null {
  if (approval.approvedAt !== null) return approval.approvedAt;
  return isApprovalComplete({ approverUserNames, approvedBy: approval.approvedBy }) ? now : null;
}

export type ApprovalState = {
  userName: string;
  /** null while waiting. */
  approvedAt: string | null;
  isCurrentApprover: boolean;
};

/** Current approvers in list order, with their stamp or none, then people who approved but have since left the list. */
export function listApprovalStates({
  approverUserNames,
  approvedBy,
}: {
  approverUserNames: string[];
  approvedBy: TopicDetailApprovalStamp[];
}): ApprovalState[] {
  const stampsByUserName = new Map(approvedBy.map((stamp) => [stamp.userName, stamp]));
  const current = approverUserNames.map((userName) => ({
    userName,
    approvedAt: stampsByUserName.get(userName)?.at ?? null,
    isCurrentApprover: true,
  }));
  const currentUserNames = new Set(approverUserNames);
  const former = approvedBy
    .filter((stamp) => !currentUserNames.has(stamp.userName))
    .map((stamp) => ({ userName: stamp.userName, approvedAt: stamp.at, isCurrentApprover: false }));
  return [...current, ...former];
}

/** What the UI shows about a document's head version. */
export type ApprovalProps = {
  status: TopicDetailStatus;
  approvalStates: ApprovalState[];
  /** Empty once approved. */
  pendingApproverUserNames: string[];
  /** The version the AI reads, or null when no version has been approved yet. */
  liveVersion: number | null;
};

export function deriveApprovalProps({
  head,
  live,
  approverUserNames,
}: {
  head: Pick<TopicDetailDoc, "approval">;
  live: Pick<TopicDetailDoc, "version"> | null;
  approverUserNames: string[];
}): ApprovalProps {
  const status: TopicDetailStatus = isApproved(head) ? "approved" : "pending";
  const { approvedBy } = head.approval;
  return {
    status,
    approvalStates: listApprovalStates({ approverUserNames, approvedBy }),
    pendingApproverUserNames: status === "approved" ? [] : pendingApproverUserNames({ approverUserNames, approvedBy }),
    liveVersion: live ? live.version : null,
  };
}
