import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboEmployee, QboEmployeeSummary } from "@/app/qbo/employee/types/QboEmployeeTypes";
import { sortEmployeesByName, summarizeEmployee } from "@/app/qbo/employee/_lib/qboEmployeeUtils";

// Server only. Read-only. The where clause matters: a bare query may return active records
// only, and an inactive employee still holds its name, so it must stay visible. Each employee is
// cut down before it leaves the server (see qboEmployeeUtils): the SSN, birth date and pay rate
// never reach the browser.
export async function loadQboEmployees(): Promise<QboEmployeeSummary[]> {
  const employees = await qboQueryAll<QboEmployee>({
    entity: "Employee",
    where: "Active IN (true, false)",
  });
  return sortEmployeesByName(employees.map(summarizeEmployee));
}
