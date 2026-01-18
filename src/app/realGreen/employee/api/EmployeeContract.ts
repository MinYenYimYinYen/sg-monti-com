import { ArrayResponse } from "@/lib/api/types/responses";
import { Employee } from "@/app/realGreen/employee/Employee";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface EmployeeContract extends ApiContract {
  getAll: {
    params: {};
    result: ArrayResponse<Employee>;
  };
}
