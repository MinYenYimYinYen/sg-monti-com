import Papa from "papaparse";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { TimeCard } from "@/app/timeCard/TimeCard";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

export type HoursByWeekRow = {
  employeeId: string;
  employeeName: string;
  weekStart: string; // "yyyy-MM-dd" Sunday
  weekRange: string; // "04/05/2026-04/11/2026"
  regHours: number;
  otHours: number;
  totalHours: number;
};

export type EmployeeNames = {
  employeeId: string;
  name: string;
  nameLastFirst: string;
};

const RANGE_FORMAT = "MM/dd/yyyy";

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function formatWeekRange(weekStart: string): string {
  const start = prettyDate(weekStart, RANGE_FORMAT);
  const end = prettyDate(dateStrings.weekEndOf(weekStart), RANGE_FORMAT);
  return `${start}-${end}`;
}

/**
 * One row per employee per Sunday–Saturday week that has punches.
 * Each employee-week is its own TimeCard so overtime is applied per week.
 * Sorted by employee last-first name, then week.
 */
export function buildHoursByWeek({
  punches,
  employeeNames,
}: {
  punches: Punch[];
  employeeNames: Map<string, EmployeeNames>;
}): HoursByWeekRow[] {
  const punchesByEmployeeWeek = new Map<string, Punch[]>();
  for (const punch of punches) {
    const key = `${punch.employeeId}|${dateStrings.weekStartOf(punch.punchDate)}`;
    const existing = punchesByEmployeeWeek.get(key);
    if (existing) {
      existing.push(punch);
    } else {
      punchesByEmployeeWeek.set(key, [punch]);
    }
  }

  const sortable: { sortName: string; row: HoursByWeekRow }[] = [];
  for (const weekPunches of punchesByEmployeeWeek.values()) {
    const first = weekPunches[0]!;
    const weekStart = dateStrings.weekStartOf(first.punchDate);
    const employee = employeeNames.get(first.employeeId);
    const timeCard = new TimeCard(weekPunches);

    sortable.push({
      sortName: employee?.nameLastFirst ?? first.employeeId,
      row: {
        employeeId: first.employeeId,
        employeeName: employee?.name ?? first.employeeId,
        weekStart,
        weekRange: formatWeekRange(weekStart),
        regHours: minutesToHours(timeCard.regularMinutes),
        otHours: minutesToHours(timeCard.overtimeMinutes),
        totalHours: minutesToHours(timeCard.totalMinutes),
      },
    });
  }

  return sortable
    .sort(
      (a, b) =>
        a.sortName.localeCompare(b.sortName) ||
        a.row.weekStart.localeCompare(b.row.weekStart),
    )
    .map(({ row }) => row);
}

export function buildHoursByWeekCsv(rows: HoursByWeekRow[]): string {
  return Papa.unparse({
    fields: ["employeeName", "weekRange", "regHours", "otHours", "totalHours"],
    data: rows.map((row) => [
      row.employeeName,
      row.weekRange,
      row.regHours,
      row.otHours,
      row.totalHours,
    ]),
  });
}
