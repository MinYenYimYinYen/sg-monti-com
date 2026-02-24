import {
  Assignment,
  AssignmentDoc,
  ServiceDoc,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { baseAssignment } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";

export function hydrateLastAssigned(
  serviceDoc: ServiceDoc,
  newAssignments: AssignmentDoc[],
  programDoc: ProgramDoc,
  employeeMap: Map<string, Employee>,
): Assignment {
  let lastAssignedFromDoc: AssignmentDoc | null = null;

  if (serviceDoc.assignments.length > 0) {
    lastAssignedFromDoc = [...serviceDoc.assignments].sort(
      (a, b) =>
        new Date(b.schedDate).getTime() - new Date(a.schedDate).getTime(),
    )[0];
  }

  const lastAssignedFromNew =
    newAssignments.find((a) => a.servId === serviceDoc.servId) ?? null;

  const modifiedBaseAssignmentDoc: AssignmentDoc = {
    ...baseAssignment,
    servId: serviceDoc.servId,
    status: serviceDoc.status,
    schedDate: programDoc.nextDate,
    employeeId: baseStrId,
  };

  const shouldHaveAssignment = () => {
    const isPrinted = serviceDoc.status === "$";
    const hasNextDate = programDoc.nextDate.length > 0;
    return isPrinted && hasNextDate;
  };

  const doc: AssignmentDoc = {
    ...(shouldHaveAssignment() ? modifiedBaseAssignmentDoc : baseAssignment),
    ...lastAssignedFromDoc,
    ...lastAssignedFromNew,
  };

  const employee = employeeMap.get(doc.employeeId) ?? baseEmployee;

  return {
    ...doc,
    employee,
  };
}
