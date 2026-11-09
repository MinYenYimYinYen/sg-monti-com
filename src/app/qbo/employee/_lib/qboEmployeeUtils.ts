import { QboEmployee, QboEmployeeSummary } from "@/app/qbo/employee/types/QboEmployeeTypes";

// Pure helpers for employees, free of fetch and the database so they can be tested.

/** Keeps only the name and the active flag. The SSN, birth date, pay rate and address stay behind. */
export function summarizeEmployee(employee: QboEmployee): QboEmployeeSummary {
  const nameFromParts = [employee.GivenName, employee.MiddleName, employee.FamilyName]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  return {
    Id: employee.Id,
    DisplayName: employee.DisplayName ?? nameFromParts,
    Active: employee.Active ?? true,
  };
}

/** Case-insensitive, so "emily" and "Emily" sort together. Returns a new list. */
export function sortEmployeesByName(employees: QboEmployeeSummary[]): QboEmployeeSummary[] {
  return [...employees].sort((a, b) =>
    a.DisplayName.localeCompare(b.DisplayName, undefined, { sensitivity: "base" }),
  );
}
