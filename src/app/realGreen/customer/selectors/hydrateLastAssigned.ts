import {
  Assignment,
  ServiceDoc,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { baseAssignment } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

export function hydrateLastAssigned(
  serviceDoc: ServiceDoc,
  newAssignments: Assignment[],
  programDoc: ProgramDoc,
): Assignment {
  let lastAssignedFromDoc: Assignment | null = null;

  if (serviceDoc.assignments.length > 0) {
    lastAssignedFromDoc = [...serviceDoc.assignments].sort(
      (a, b) =>
        new Date(b.schedDate).getTime() - new Date(a.schedDate).getTime(),
    )[0];
  }

  const lastAssignedFromNew =
    newAssignments.find((a) => a.servId === serviceDoc.servId) ?? null;

  const modifiedBaseAssignment: Assignment = {
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

  return {
    ...(shouldHaveAssignment() ? modifiedBaseAssignment : baseAssignment),
    ...lastAssignedFromDoc,
    ...lastAssignedFromNew,
  };
}
