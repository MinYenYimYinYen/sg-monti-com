import {
  EmployeeCore,
  EmployeeDoc,
  EmployeeDocProps,
  EmployeeRaw,
} from "@/app/realGreen/employee/types/EmployeeTypes";
import { EmployeeModel } from "@/app/realGreen/employee/models/EmployeeModel";
import { baseEmployeeDocProps } from "@/app/realGreen/employee/_lib/baseEmployee";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

function remapEmployee(employee: EmployeeRaw): EmployeeCore {
  const { id, email } = employee;
  return {
    employeeId: id,
    name: employee.name || "",
    email: email || "",
    active: employee.active,
  };
}

export function remapEmployees(raw: EmployeeRaw[]): EmployeeCore[] {
  return raw.map(remapEmployee);
}

export async function extendEmployees(
  cores: EmployeeCore[],
): Promise<EmployeeDoc[]> {
  return extendEntities<EmployeeCore, EmployeeDocProps, EmployeeDoc>({
    cores,
    model: EmployeeModel,
    idField: "employeeId",
    baseDocProps: baseEmployeeDocProps,
  });
}
