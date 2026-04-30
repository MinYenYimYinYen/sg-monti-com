import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";
import { AssignmentPlan } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

// export function hydrateAssignedTo(
//   employeeIds: string[],
//   employeeMap: Map<string, Employee>,
// ): Employee[] {
//   return employeeIds.map(
//     (id) =>
//       employeeMap.get(id) ?? {
//         ...baseEmployee,
//         employeeId: id,
//         name: id,
//         active: true,
//       },
//   );
// }

export function hydrateAssignedTo({
  servCodeId,
  assignmentsByServCodeId,
  employeeMap,
}: {
  servCodeId: string;
  assignmentsByServCodeId: Map<string, AssignmentPlan>;
  employeeMap: Map<string, Employee>;
}) {
  const assignmentPlan = assignmentsByServCodeId.get(servCodeId)
  if (!assignmentPlan) {
    return []
  }
  const employees = assignmentPlan.employeeIds.map(
    (id) =>
      employeeMap.get(id) ?? {
        ...baseEmployee,
        employeeId: id,
        name: id,
        active: true,
      },
  );
  return employees
}
