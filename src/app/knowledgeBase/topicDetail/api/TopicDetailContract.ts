import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  LegacyImportResult,
  SaveTopicDetailVersionParams,
  TopicDetailDoc,
} from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

/**
 * Every op that changes one document answers with that document's current rows: its head, and its live
 * version when that is a different row. The client swaps them in for what it held.
 */
export interface TopicDetailContract extends ApiContract {
  /** The live (latest approved) version of every document. This is what the desktop app reads. */
  getAll: {
    params: Record<string, never>;
    result: DataResponse<TopicDetailDoc[]>;
  };
  /** What the web app loads: every document's head, plus its live version where that is a different row. */
  getCurrent: {
    params: Record<string, never>;
    result: DataResponse<TopicDetailDoc[]>;
  };
  /** Every version of one document, newest first, for when someone needs to look back. */
  getVersionHistory: {
    params: { detailKey: string };
    result: DataResponse<TopicDetailDoc[]>;
  };
  /**
   * Saves the next version. The server normalizes `topicKeys` and derives `detailKey`: different tags
   * mean a different document. The saver approves their own version when they are an approver.
   */
  saveVersion: {
    params: SaveTopicDetailVersionParams;
    result: DataResponse<TopicDetailDoc[]>;
  };
  /** The caller must be on the approver list, and the version must be the head. */
  approve: {
    params: { detailKey: string; version: number };
    result: DataResponse<TopicDetailDoc[]>;
  };
  /**
   * Takes the caller's approval back and clears `approvedAt`, so a version that was live stops being
   * served and the AI falls back to the previous approved version.
   */
  withdrawApproval: {
    params: { detailKey: string; version: number };
    result: DataResponse<TopicDetailDoc[]>;
  };
  /** A comment does not approve or reject anything. Any editor or approver can leave one. */
  comment: {
    params: { detailKey: string; version: number; text: string };
    result: DataResponse<TopicDetailDoc[]>;
  };
  /** Deletes the document and every version of it. */
  remove: {
    params: { detailKey: string };
    result: DataResponse<boolean>;
  };
  /** TEMPORARY, superuser only: imports migrateTheseThenDelete.json as approved version 1s. Delete after the run. */
  importLegacy: {
    params: Record<string, never>;
    result: DataResponse<LegacyImportResult>;
  };
}
