/**
 * Per-employee availability constraints for the paceCrawler.
 *
 * All constraint fields are optional. An employee with no record (or an empty record)
 * is assumed to be fully available (minus PTO and holidays).
 *
 * Design intent: subtractive. Define nothing = full availability.
 * Define startDate = days before it are not workable for this employee.
 * Define endDate = days after it are not workable for this employee.
 *
 * Future extensions (not implemented yet):
 *   daysOff?: ("M" | "T" | "W" | "Th" | "F")[];
 */
export type EmployeeAvailability = {
  employeeId: string;
  /** The earliest date this employee is available to work. Undefined = no restriction. */
  startDate?: string;
  /** The last date this employee is available to work. Undefined = no restriction. */
  endDate?: string;
};
