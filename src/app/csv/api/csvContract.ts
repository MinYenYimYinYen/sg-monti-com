import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { WriteError } from "mongodb";
import {AssignmentDoc} from "@/app/assignment/AssignmentTypes";

export interface CSVContract extends ApiContract {
  saveAssignments: {
    params: { assignments: AssignmentDoc[] };
    result: DataResponse<{ assignments: AssignmentDoc[]; errors: WriteError[] | null }>;
  };
  saveEta: {
    params: { servId: number; eta: string | null };
    result: DataResponse<{ servId: number; eta: string | null }>;
  };
}
