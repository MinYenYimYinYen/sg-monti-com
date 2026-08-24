import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";

export interface AssignmentGroupContract extends ApiContract {
  getGroups: {
    params: {};
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
