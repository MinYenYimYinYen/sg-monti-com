import { DataResponse } from "@/lib/api/types/responses";
import { EmployeeDoc } from "@/app/realGreen/employee/EmployeeTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface EmployeeContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<EmployeeDoc[]>;
  };
}
