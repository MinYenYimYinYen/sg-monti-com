import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

export interface AssignmentGroupContract extends ApiContract {
  getGroups: {
    params: Record<string, never>;
    result: DataResponse<AssignmentGroupDoc[]>;
  };
  upsertGroup: {
    params: AssignmentGroupDoc;
    result: DataResponse<AssignmentGroupDoc>;
  };
  deleteGroup: {
    params: { groupId: string };
    result: DataResponse<{ groupId: string }>;
  };
}
