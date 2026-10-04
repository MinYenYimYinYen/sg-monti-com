import { EmployeeGroupBreakdown } from "@/app/pace/PaceEngineTypes";
import { EmployeeProductionStats } from "@/app/pace/lib/crawlPastPhase/helpers/computeActualGroupRates";

/**
 * Computes per-employee breakdown data for a group.
 *
 * For each assigned employee:
 * - `goalDailyPrice`: from the assignment plan (null = missing, engine cannot project)
 * - `avgDailyPrice`: from past crawl history for this specific employee on this group.
 *   null when no history exists yet (employee hasn't worked this group before).
 * - `avgDaysObserved`: how many days of history this avg is based on
 * - `shareRatio`: this employee's goal / teamGoalDailyRate
 * - `requiredDailyPrice`: activePool * shareRatio / daysAvailable
 * - `daysEarlyLate`: employee-level projection
 */
export function computeEmployeeBreakdowns({
  assignedEmployeeIds,
  goalsByEmployee,
  teamGoalDailyRate,
  activePool,
  daysAvailable,
  employeeProductionStats,
}: {
  assignedEmployeeIds: string[];
  goalsByEmployee: Map<string, number | null>;
  teamGoalDailyRate: number;
  activePool: number;
  daysAvailable: number;
  /** Per-employee production stats for this group (from past phase). */
  employeeProductionStats: Map<string, EmployeeProductionStats>;
}): EmployeeGroupBreakdown[] {
  return assignedEmployeeIds.map((employeeId): EmployeeGroupBreakdown => {
    const goalDailyPrice = goalsByEmployee.get(employeeId) ?? null;
    const empStats = employeeProductionStats.get(employeeId) ?? null;

    const shareRatio =
      goalDailyPrice !== null && teamGoalDailyRate > 0
        ? goalDailyPrice / teamGoalDailyRate
        : 0;

    const requiredDailyPrice =
      goalDailyPrice !== null && daysAvailable > 0
        ? (activePool * shareRatio) / daysAvailable
        : null;

    const daysEarlyLate =
      goalDailyPrice !== null && goalDailyPrice > 0
        ? (activePool * shareRatio) / goalDailyPrice - daysAvailable
        : null;

    return {
      employeeId,
      goalDailyPrice,
      avgDailyPrice: empStats?.avgDailyPrice ?? null,
      avgDaysObserved: empStats?.daysWorked ?? 0,
      shareRatio,
      requiredDailyPrice,
      daysEarlyLate,
    };
  });
}
