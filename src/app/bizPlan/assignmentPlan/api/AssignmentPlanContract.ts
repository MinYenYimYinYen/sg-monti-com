import { ApiContract } from "@/lib/api/types/ApiContract";
import { Scenario } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface AssignmentPlanContract extends ApiContract {
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

  activateScenario: {
    params: { name: string };
    result: DataResponse<Scenario[]>;
  };
}
