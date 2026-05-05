import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";

export function hydrateAssignedTo({
  servCodeId,
  assignmentsByServCodeId,
  employeeMap,
}: {
  servCodeId: string;
  assignmentsByServCodeId: Map<string, string[]>;
  employeeMap: Map<string, Employee>;
}): Employee[] {
  const employeeIds = assignmentsByServCodeId.get(servCodeId);
  if (!employeeIds) {
    return [];
  }
  return employeeIds.map(
    (id) =>
      employeeMap.get(id) ?? {
        ...baseEmployee,
        employeeId: id,
        name: id,
        active: true,
      },
  );
}
