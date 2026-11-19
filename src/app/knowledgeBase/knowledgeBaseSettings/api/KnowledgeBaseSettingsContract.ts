import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import type {
  ApproverCandidate,
  KnowledgeBaseSettingDoc,
  KnowledgeBaseSettingInput,
} from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsTypes";

export interface KnowledgeBaseSettingsContract extends ApiContract {
  /** Every registered setting, with the code default for any that was never saved. */
  getAll: {
    params: Record<string, never>;
    result: DataResponse<KnowledgeBaseSettingDoc[]>;
  };
  /** Validates the value for its key, saves it, and returns the setting as stored. */
  upsert: {
    params: KnowledgeBaseSettingInput;
    result: DataResponse<KnowledgeBaseSettingDoc>;
  };
  /** The users who could be picked as approvers, for the editor. Kiosk accounts are left out. */
  getApproverCandidates: {
    params: Record<string, never>;
    result: DataResponse<ApproverCandidate[]>;
  };
}
