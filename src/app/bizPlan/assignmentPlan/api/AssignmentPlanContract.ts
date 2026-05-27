import { ApiContract } from "@/lib/api/types/ApiContract";
import { AssignmentPlan, Scenario } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface AssignmentPlanContract extends ApiContract {
  getAssignmentPlans: {
    params: {};
    result: DataResponse<AssignmentPlan[]>;
  };

  upsertAssignmentPlan: {
    params: AssignmentPlan;
    result: DataResponse<AssignmentPlan>;
  };

  // Probably no need for delete, can just upsert servCodeId with empty array.

  getScenarios: {
    params: {};
    result: DataResponse<Scenario[]>;
  };

  upsertScenario: {
    params: Scenario;
    result: DataResponse<Scenario>;
  };

  deleteScenario: {
    params: { name: string };
    result: DataResponse<{ name: string }>;
  };
}
