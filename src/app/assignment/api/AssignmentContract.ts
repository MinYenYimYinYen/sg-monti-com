import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

export interface AssignmentContract extends ApiContract {
  getByEmployeeIdAndSchedDate: {
    params: { employeeId: string; schedDate: string };
    result: DataResponse<AssignmentDoc[]>;
  };
  getBySchedDate: {
    params: { schedDate: string };
    result: DataResponse<AssignmentDoc[]>;
  };
  getAvailableDates: {
    params: { season: number };
    result: DataResponse<string[]>;
  };
}
