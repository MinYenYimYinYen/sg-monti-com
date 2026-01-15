import { ArrayResponse } from "@/lib/api/types/responses";
import { Employee } from "@/app/realGreen/employee/Employee";

export interface EmployeeContract {
  getAll: {
    params: {};
    result: ArrayResponse<Employee>;
  };
}
