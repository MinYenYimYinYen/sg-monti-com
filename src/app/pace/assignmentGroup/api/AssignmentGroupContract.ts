import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

export interface AssignmentGroupContract extends ApiContract {
  getGroups: {
    params: Record<string, never>;
    result: DataResponse<AssignmentGroup[]>;
  };
  upsertGroup: {
    params: AssignmentGroup;
    result: DataResponse<AssignmentGroup>;
  };
  deleteGroup: {
    params: { groupId: string };
    result: DataResponse<{ groupId: string }>;
  };
}
