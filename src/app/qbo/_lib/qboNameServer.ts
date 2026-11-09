import { loadQboCustomers } from "@/app/qbo/customer/_lib/qboCustomerServer";
import { loadQboEmployees } from "@/app/qbo/employee/_lib/qboEmployeeServer";
import { buildUsedNames, findUsedName, QboUsedName } from "@/app/qbo/_lib/qboNameUtils";

// Server only. Always a fresh read, never the browser's session copy.

/**
 * The customer or employee holding this name, if any. Vendors are not read here: a caller
 * creating a vendor already reads them, and they need different handling when they match.
 */
export async function findFreshCustomerOrEmployeeName(name: string): Promise<QboUsedName | null> {
  const [customers, employees] = await Promise.all([loadQboCustomers(), loadQboEmployees()]);
  return findUsedName({ usedNames: buildUsedNames({ customers, employees }), name });
}
