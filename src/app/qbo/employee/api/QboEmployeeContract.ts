import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { QboEmployeeSummary } from "@/app/qbo/employee/types/QboEmployeeTypes";

export interface QboEmployeeContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<QboEmployeeSummary[]>;
  };
}
