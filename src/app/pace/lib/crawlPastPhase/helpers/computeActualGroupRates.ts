/**
 * Computes per-group, per-employee actual production stats from the accumulated
 * production map returned by `accumulateActualProduction`.
 *
 * Input: Map<groupId, Map<employeeId, Map<date, price>>>
 *
 * Returns: Map<groupId, { groupStats, byEmployee }>
 *
 * `groupStats` aggregates across all employees (including the "_team" fallback key)
 * for group-level display (actualDaysWorked, actualPriceCompleted, actualTeamDailyRate).
 *
 * `byEmployee` provides per-employee stats for the employee breakdown cards.
 * The "_team" key is excluded from `byEmployee` — it represents unattributed production.
 */

export type EmployeeProductionStats = {
  /** Number of distinct dates this employee worked this group. */
  daysWorked: number;
  /** Total $ attributed to this employee on this group. */
  priceCompleted: number;
  /** Average $/day on days this employee worked this group. null when no history. */
  avgDailyPrice: number | null;
};

export type GroupProductionStats = {
  /** Total distinct production days across all employees (union of dates). */
  actualDaysWorked: number;
  /** Total $ completed across all employees. */
  actualPriceCompleted: number;
  /** Avg team $/day on days the group was worked. null when no history. */
  actualTeamDailyRate: number | null;
  /** Per-employee stats. Excludes the "_team" fallback key. */
  byEmployee: Map<string, EmployeeProductionStats>;
};

export function computeActualGroupRates(
  productionByGroupByEmployeeByDate: Map<string, Map<string, Map<string, number>>>,
): Map<string, GroupProductionStats> {
  const result = new Map<string, GroupProductionStats>();

  for (const [groupId, byEmployee] of productionByGroupByEmployeeByDate) {
    // Collect all unique dates across all employees for group-level day count
    const allDates = new Set<string>();
    let actualPriceCompleted = 0;
    const employeeStats = new Map<string, EmployeeProductionStats>();

    for (const [employeeId, byDate] of byEmployee) {
      const dailyTotals = Array.from(byDate.values());
      const priceCompleted = dailyTotals.reduce((sum, p) => sum + p, 0);
      const daysWorked = dailyTotals.length;

      actualPriceCompleted += priceCompleted;
      for (const date of byDate.keys()) allDates.add(date);

      // Exclude the "_team" fallback from per-employee breakdown
      if (employeeId !== "_team") {
        employeeStats.set(employeeId, {
          daysWorked,
          priceCompleted,
          avgDailyPrice: daysWorked > 0 ? priceCompleted / daysWorked : null,
        });
      }
    }

    const actualDaysWorked = allDates.size;
    const actualTeamDailyRate =
      actualDaysWorked > 0 ? actualPriceCompleted / actualDaysWorked : null;

    result.set(groupId, {
      actualDaysWorked,
      actualPriceCompleted,
      actualTeamDailyRate,
      byEmployee: employeeStats,
    });
  }

  return result;
}
