import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

export interface GroupSequenceContract extends ApiContract {
  getSequences: {
    params: Record<string, never>;
    result: DataResponse<GroupSequence[]>;
  };
  upsertSequence: {
    params: GroupSequence;
    result: DataResponse<GroupSequence>;
  };
  deleteSequence: {
    params: { sequenceId: string };
    result: DataResponse<{ sequenceId: string }>;
  };
}
