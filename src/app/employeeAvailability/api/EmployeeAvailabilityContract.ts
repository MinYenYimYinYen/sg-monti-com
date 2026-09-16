import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

export interface EmployeeAvailabilityContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<EmployeeAvailability[]>;
  };
  upsert: {
    params: { doc: EmployeeAvailability };
    result: DataResponse<EmployeeAvailability>;
  };
  deleteOne: {
    params: { employeeId: string };
    result: DataResponse<EmployeeAvailability>;
  };
}
