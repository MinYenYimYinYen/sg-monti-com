import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// Person reference: `modifiedBy`, `approval.approvedBy[].userName` and `comments[].userName` are
// History (mongo.readme.md section 4): kept when the user is deleted, so they are NOT in
// `deleteUserReferences`. They store `userName` rather than `saId` on purpose. The approver list names
// userNames, and "who still has to approve" is a plain comparison of the two. This is the documented
// drift in mongo.readme.md.

export type TopicDetailApprovalStamp = { userName: string; at: string };

export type TopicDetailComment = { userName: string; at: string; text: string };

export type TopicDetailApproval = {
  /**
   * null while the version is pending. Set once, when the last required approver stamps it, and never
   * recomputed against a changed approver list, so adding or removing an approver cannot take a live
   * version away from the AI. Only `withdrawApproval` clears it.
   */
  approvedAt: string | null;
  /** Everyone who approved this version, including people who are no longer approvers. */
  approvedBy: TopicDetailApprovalStamp[];
};

/**
 * One version of a knowledge base document. A document is identified by the set of topics it applies
 * to: `[sales]` is the sales overview, `[aeration]` says what aeration is, and `[aeration, sales]` is how
 * to sell aeration specifically. A consumer loads every document whose `topicKeys` are all among the
 * matched topics, general to specific.
 *
 * A row never changes after it is saved, except to gain approvals and comments. An edit is a new row
 * with the next `version`. Two versions of a document matter: the head (highest version, what editors
 * and reviewers work on) and the live one (highest version with `approvedAt` set, the only one the AI reads).
 */
export type TopicDetailDoc = CreatedUpdated & {
  /** Derived by the server from `topicKeys` (for example `aeration+sales`). Clients never send it. */
  detailKey: string;
  /** Starts at 1. Unique together with `detailKey`. */
  version: number;
  /** Sorted, deduplicated and non-empty. Every key is an existing `Topic.topicKey`. Identical on every version of a document. */
  topicKeys: string[];
  title: string;
  /** TipTap HTML. The only content field; consumers convert it to what they need. */
  contentHtml: string;
  /** Who saved this version. */
  modifiedBy: string;
  approval: TopicDetailApproval;
  comments: TopicDetailComment[];
};

export type SaveTopicDetailVersionParams = Pick<TopicDetailDoc, "topicKeys" | "title" | "contentHtml"> & {
  /**
   * The version the editor started from, or null when creating the document. The server refuses a
   * save when the head has moved on, so two editors cannot silently overwrite each other.
   */
  baseVersion: number | null;
};

// TEMPORARY, with the legacy import (delete with migrateTheseThenDelete.json).
export type LegacyImportResult = {
  importedDetailKeys: string[];
  skipped: { detailKey: string; reason: string }[];
};
