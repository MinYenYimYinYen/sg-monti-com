import { dateRanges } from "@/lib/primatives/dates/dateStrings";

export type PaceAnalysis = {
  teamGoalDailyRate: number;
  daysNeeded: number | null;
  daysAvailable: number;
  daysEarlyLate: number | null;
  isOnTrack: boolean;
  isOverdue: boolean;
  missingGoals: string[];
};

/**
 * Computes the single-source-of-truth pace analysis for a group.
 *
 * - `teamGoalDailyRate`: sum of all assigned employees' goalDailyPrice.
 * - `daysNeeded`: activePool / teamGoalDailyRate. null if any goal is missing.
 * - `daysAvailable`: weekdays in [mainDate, plannedEnd], accounting for holidays.
 *   Falls back to 0 when no plannedEnd is set.
 * - `daysEarlyLate`: daysNeeded - daysAvailable. Positive = late, negative = early.
 * - `isOnTrack`: daysEarlyLate <= 0.
 * - `isOverdue`: plannedEnd < mainDate AND activePool > 0.
 * - `missingGoals`: employeeIds with null goalDailyPrice.
 */
export function computePaceAnalysis({
  assignedEmployeeIds,
  goalsByEmployee,
  activePool,
  plannedEnd,
  mainDate,
  holidayDates,
}: {
  assignedEmployeeIds: string[];
  goalsByEmployee: Map<string, number | null>;
  activePool: number;
  plannedEnd: string | null;
  mainDate: string;
  holidayDates: Set<string>;
}): PaceAnalysis {
  const missingGoals: string[] = [];
  let teamGoalDailyRate = 0;

  for (const employeeId of assignedEmployeeIds) {
    const goal = goalsByEmployee.get(employeeId) ?? null;
    if (goal === null) {
      missingGoals.push(employeeId);
    } else {
      teamGoalDailyRate += goal;
    }
  }

  const hasMissingGoals = missingGoals.length > 0;

  const daysNeeded =
    !hasMissingGoals && teamGoalDailyRate > 0
      ? activePool / teamGoalDailyRate
      : null;

  // Count weekdays between mainDate and plannedEnd, excluding holidays
  let daysAvailable = 0;
  if (plannedEnd && plannedEnd > mainDate) {
    const rawWeekdays = dateRanges.weekdaysBetween(mainDate, plannedEnd);
    // Subtract holidays that fall in the window
    let holidayCount = 0;
    for (const holidayDate of holidayDates) {
      if (holidayDate > mainDate && holidayDate <= plannedEnd) {
        holidayCount++;
      }
    }
    daysAvailable = Math.max(0, rawWeekdays - holidayCount);
  }

  const daysEarlyLate =
    daysNeeded !== null ? daysNeeded - daysAvailable : null;

  const isOnTrack = daysEarlyLate !== null ? daysEarlyLate <= 0 : false;
  const isOverdue = plannedEnd !== null && plannedEnd < mainDate && activePool > 0;

  return {
    teamGoalDailyRate,
    daysNeeded,
    daysAvailable,
    daysEarlyLate,
    isOnTrack,
    isOverdue,
    missingGoals,
  };
}
