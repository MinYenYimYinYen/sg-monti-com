import {
  EmployeeCore,
  EmployeeDoc,
  EmployeeRaw,
} from "@/app/realGreen/employee/EmployeeTypes";

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
  throw new Error("Not implemented");
}
