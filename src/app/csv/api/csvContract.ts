import { ApiContract } from "@/lib/api/types/ApiContract";
import { AssignmentDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { DataResponse } from "@/lib/api/types/responses";
import { WriteError } from "mongodb";

export interface CSVContract extends ApiContract {
  saveAssignments: {
    params: { assignments: AssignmentDoc[] };
    result: DataResponse<{assignments: AssignmentDoc[], errors: WriteError[] | null}>;
  };
}
