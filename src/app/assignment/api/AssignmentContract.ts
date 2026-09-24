import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { WriteError } from "mongodb";

export interface AssignmentContract extends ApiContract {
  getByServIds: {
    params: { servIds: number[] };
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
  getBySchedDateRange: {
    params: { dateRange: TRange<string> };
    result: DataResponse<AssignmentDoc[]>;
  };
  saveAssignments: {
    params: { assignments: AssignmentDoc[] };
    result: DataResponse<{ assignments: AssignmentDoc[]; errors: WriteError[] | null }>;
  };
}
