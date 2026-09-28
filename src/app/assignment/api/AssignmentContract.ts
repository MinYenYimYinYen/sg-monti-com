import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AssignmentDoc, ServiceAssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { WriteError } from "mongodb";

export interface AssignmentContract extends ApiContract {
  /** Returns full ServiceAssignmentDoc[] for the given servIds (full history for AssignmentUtils). */
  getByServIds: {
    params: { servIds: number[] };
    result: DataResponse<ServiceAssignmentDoc[]>;
  };
  /** Returns ServiceAssignmentDoc[] for services that have any assignment on the given date. */
  getBySchedDate: {
    params: { schedDate: string };
    result: DataResponse<ServiceAssignmentDoc[]>;
  };
  /** Returns available assignment dates for a season (for the date picker). */
  getAvailableDates: {
    params: { season: number };
    result: DataResponse<string[]>;
  };
  /** Returns ServiceAssignmentDoc[] for services that have any assignment in the date range. */
  getBySchedDateRange: {
    params: { dateRange: TRange<string> };
    result: DataResponse<ServiceAssignmentDoc[]>;
  };
  /** Appends new assignment entries (append-only with dedup guard). */
  saveAssignments: {
    params: { assignments: AssignmentDoc[] };
    result: DataResponse<{ assignments: AssignmentDoc[]; errors: WriteError[] | null }>;
  };
}
