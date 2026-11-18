import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import type {
  AppendTurnParams,
  AppendTurnResult,
  ClaudeSessionDoc,
  ClaudeSessionTurnDoc,
} from "@/app/claudeSession/ClaudeSessionTypes";

export interface ClaudeSessionContract extends ApiContract {
  getSessions: {
    params: Record<string, never>;
    result: DataResponse<ClaudeSessionDoc[]>;
  };
  getTurns: {
    params: { sessionId: string };
    result: DataResponse<ClaudeSessionTurnDoc[]>;
  };
  /** Creates the session on its first turn. The caller becomes its owner. */
  appendTurn: {
    params: AppendTurnParams;
    result: DataResponse<AppendTurnResult>;
  };
  removeSession: {
    params: { sessionId: string };
    result: DataResponse<boolean>;
  };
}
