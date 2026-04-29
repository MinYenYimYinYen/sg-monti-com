import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";

export function hydrateAssignedTo(
  employeeIds: string[],
  employeeMap: Map<string, Employee>,
): Employee[] {
  return employeeIds.map(
    (id) => employeeMap.get(id) ?? { ...baseEmployee, employeeId: id, name: id, active: true },
  );
}
