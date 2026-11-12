import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { EmployeeRaw } from "@/app/realGreen/employee/types/EmployeeTypes";
import { AppError } from "@/lib/errors/AppError";
import type { EmployeeLookupOutcome } from "@/app/auth/_lib/userCreation";

/**
 * Asks RealGreen about an employee id and reports what happened, without throwing, so
 * judgeBogusSaId (pure) can decide. The id is validated before it gets here and is encoded
 * anyway, because it is placed in an upstream URL path.
 */
export async function lookupEmployeeOutcome(saId: string): Promise<EmployeeLookupOutcome> {
  try {
    const employee = await rgApi<EmployeeRaw | null>({
      path: `/Employee/${encodeURIComponent(saId)}`,
      method: "GET",
      pathTemplate: "/Employee/{employeeId}",
    });
    return { kind: "returned", employeeId: employee?.id };
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "failed", errorType: error.type, statusCode: error.statusCode, message: error.message };
    }
    return { kind: "failed", message: error instanceof Error ? error.message : "Unknown error" };
  }
}
