import { ApiContract } from "@/lib/api/types/ApiContract";
import { Assignment } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { DataResponse } from "@/lib/api/types/responses";
import { WriteError } from "mongodb";

export interface CSVContract extends ApiContract {
  saveAssignments: {
    params: { assignments: Assignment[] };
    result: DataResponse<{assignments: Assignment[], errors: WriteError[] | null}>;
  };
}
