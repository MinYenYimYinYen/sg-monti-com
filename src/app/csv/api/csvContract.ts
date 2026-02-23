import { ApiContract } from "@/lib/api/types/ApiContract";
import { Assignment } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface CSVContract extends ApiContract {
  saveAssignments: {
    params: Assignment[],
    result: DataResponse<Assignment[]>

  }
}