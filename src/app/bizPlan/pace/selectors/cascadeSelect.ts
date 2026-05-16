import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/rawPaceSelect";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  NULL_PROGRAM_TYPE_KEY,
  LookbackStats,
  accumulateDailyProduction,
  computeLookbackStats,
  getValidProductionDates,
} from "@/app/bizPlan/pace/_lib/employeeLookbackUtils";
import {
  EmployeeCascadeEntry,
  EmployeeCascadeResult,
  PaceCategory,
  LookbackConfig,
} from "@/app/bizPlan/pace/PaceTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

// ---------------------------------------------------------------------------
// Slice selectors
// ---------------------------------------------------------------------------

const selectLookbackConfig = (state: AppState): LookbackConfig =>
  state.pace.lookbackConfig;

// employeePace slice selectors — sourced from employeePaceSlice
const selectMainDate = (state: AppState): string => state.employeePace.mainDate;

const selectEmployeeDates = (state: AppState): Record<string, string> =>
  state.employeePace.employeeDates;

const selectPaceTolerance = (state: AppState): number =>
  state.employeePace.paceTolerance;

const selectShowUpcoming = (state: AppState): boolean =>
  state.employeePace.showUpcoming;

const selectRateMode = (state: AppState): "avg" | "max" =>
  state.employeePace.rateMode;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_URGENCY: Record<PaceCategory, number> = {
  asap: 0,
  overdue: 1,
  inProgress: 2,
  notStarted: 3,
  notSet: 4,
};

function mostUrgentCategory(categories: PaceCategory[]): PaceCategory {
  return categories.reduce((best, c) =>
    CATEGORY_URGENCY[c] < CATEGORY_URGENCY[best] ? c : best,
  );
}

function safeDivideCSP(
  numerator: CountSizePrice,
  denominator: CountSizePrice,
): CountSizePrice | null {
  if (
    denominator.count === 0 &&
    denominator.size === 0 &&
    denominator.price === 0 &&
    denominator.rev === 0
  ) {
    return null;
  }
  return {
    count: denominator.count !== 0 ? numerator.count / denominator.count : 0,
    size: denominator.size !== 0 ? numerator.size / denominator.size : 0,
    price: denominator.price !== 0 ? numerator.price / denominator.price : 0,
    rev: denominator.rev !== 0 ? numerator.rev / denominator.rev : 0,
  };
}

function minCSP(a: CountSizePrice, b: CountSizePrice): CountSizePrice {
  return {
    count: Math.min(a.count, b.count),
    size: Math.min(a.size, b.size),
    price: Math.min(a.price, b.price),
    rev: Math.min(a.rev, b.rev),
  };
}

// ---------------------------------------------------------------------------
// Layer 2 — Employee Lookback
// ---------------------------------------------------------------------------

type EmployeeLookbackMap = Map<string, Map<string, LookbackStats | null>>;

const selectEmployeeLookbackMap = createSelector(
  [deepSelect.servCodes, selectLookbackConfig],
  (servCodes, lookbackConfig): EmployeeLookbackMap => {
    const allServices = servCodes.flatMap((sc) => sc.services);
    const windowServices = allServices.filter((s) => {
      if (s.status === "S" && s.production?.doneDate != null) {
        return s.production.doneDate >= lookbackConfig.lookbackStart;
      }
      if (s.status === "$" && s.lastAssigned.schedDate != null) {
        return s.lastAssigned.schedDate >= lookbackConfig.lookbackStart;
      }
      return false;
    });

    const validDates = getValidProductionDates(
      windowServices,
      lookbackConfig.completionThreshold,
    );
    const rawAccumulation = accumulateDailyProduction(
      windowServices,
      validDates,
    );

    // Compute totalAvgDailyCSP per employee across all programTypes
    const totalAccumulator = new Map<string, Map<string, CountSizePrice>>();
    for (const service of windowServices) {
      let effectiveDate: string | null = null;
      if (service.status === "S" && service.production?.doneDate) {
        effectiveDate = service.production.doneDate;
      } else if (service.status === "$" && service.lastAssigned.schedDate) {
        effectiveDate = service.lastAssigned.schedDate;
      }
      if (!effectiveDate || !validDates.has(effectiveDate)) continue;

      const serviceCSP = CountSizePriceOps.fromService(service);

      if (service.status === "S" && service.production?.doneBys) {
        for (const doneBy of service.production.doneBys) {
          const employeeId = doneBy.employeeId;
          const contribution = CountSizePriceOps.multiply(
            serviceCSP,
            doneBy.percent,
          );
          if (!totalAccumulator.has(employeeId))
            totalAccumulator.set(employeeId, new Map());
          const byDate = totalAccumulator.get(employeeId)!;
          const existing = byDate.get(effectiveDate) ?? {
            ...baseCountSizePrice,
          };
          byDate.set(
            effectiveDate,
            CountSizePriceOps.sum(existing, contribution),
          );
        }
      } else if (service.status === "$" && service.lastAssigned.employeeId) {
        const employeeId = service.lastAssigned.employeeId;
        if (!totalAccumulator.has(employeeId))
          totalAccumulator.set(employeeId, new Map());
        const byDate = totalAccumulator.get(employeeId)!;
        const existing = byDate.get(effectiveDate) ?? { ...baseCountSizePrice };
        byDate.set(effectiveDate, CountSizePriceOps.sum(existing, serviceCSP));
      }
    }

    const totalAvgByEmployee = new Map<string, CountSizePrice>();
    for (const [employeeId, byDate] of totalAccumulator) {
      const dailyTotals = Array.from(byDate.values());
      const totalSum = CountSizePriceOps.sumAll(dailyTotals);
      totalAvgByEmployee.set(
        employeeId,
        CountSizePriceOps.divideBy(totalSum, dailyTotals.length),
      );
    }

    const result: EmployeeLookbackMap = new Map();
    for (const [employeeId, byProgramType] of rawAccumulation) {
      const totalAvgDailyCSP = totalAvgByEmployee.get(employeeId) ?? {
        ...baseCountSizePrice,
      };
      const statsMap = new Map<string, LookbackStats | null>();
      for (const [programTypeKey, dailyProductions] of byProgramType) {
        statsMap.set(
          programTypeKey,
          computeLookbackStats(dailyProductions, totalAvgDailyCSP),
        );
      }
      result.set(employeeId, statsMap);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 3 — Employee Cascade (sequential-completion, per-employee weighted share)
// ---------------------------------------------------------------------------

const selectEmployeeCascadeResults = createSelector(
  [
    rawPaceSelect.rawServCodePacesPerDayMap,
    selectEmployeeLookbackMap,
    employeeSelect.employeeMap,
    selectMainDate,
  ],
  (perDayMap, lookbackMap, employeeMap, mainDate): EmployeeCascadeResult[] => {
    // Use mainDate as the reference point so the cascade reflects the selected view date.
    // This ensures the overdue check and pool-start calculations are correct when the user
    // is viewing a future date (e.g., next Monday) where a servCode is already past its max.
    const today = mainDate;
    const results: EmployeeCascadeResult[] = [];

    // Pre-compute per-employee latest printed schedDate across all servCodes.
    // If an employee has any printed service on a given date, their openDate for every
    // servCode is pushed to the weekday after that date — they're already booked.
    const employeeLatestPrintedDate = new Map<string, string>();
    for (const [, perDay] of perDayMap) {
      for (const service of perDay.servCode.services) {
        if (
          service.status === "$" &&
          service.lastAssigned.schedDate &&
          service.lastAssigned.employeeId
        ) {
          const existing = employeeLatestPrintedDate.get(
            service.lastAssigned.employeeId,
          );
          if (!existing || service.lastAssigned.schedDate > existing) {
            employeeLatestPrintedDate.set(
              service.lastAssigned.employeeId,
              service.lastAssigned.schedDate,
            );
          }
        }
      }
    }

    // Pre-compute per-servCode team stats for weighted share calculation.
    // For each servCode: sum avgDailyCSP of all assigned employees with lookback data.
    // Used to compute each employee's proportional share of the work pool.
    const teamStatsCache = new Map<
      string,
      {
        teamAvgCSP: CountSizePrice;
        teamMaxCSP: CountSizePrice;
        knownCount: number;
        totalAssigned: number;
        avgTotalAvgDailyCSP: CountSizePrice; // avg of known employees' totalAvgDailyCSP
      }
    >();

    for (const [servCodeId, perDay] of perDayMap) {
      const programTypeKey =
        perDay.servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
      const assignedEmployees = perDay.servCode.assignedTo;

      let teamAvgCSP = { ...baseCountSizePrice };
      let teamMaxCSP = { ...baseCountSizePrice };
      let knownCount = 0;
      const knownTotalAvgs: CountSizePrice[] = [];

      for (const employee of assignedEmployees) {
        const stats =
          lookbackMap.get(employee.employeeId)?.get(programTypeKey) ?? null;
        if (stats) {
          teamAvgCSP = CountSizePriceOps.sum(teamAvgCSP, stats.avgDailyCSP);
          teamMaxCSP = CountSizePriceOps.sum(teamMaxCSP, stats.maxDailyCSP);
          knownTotalAvgs.push(stats.totalAvgDailyCSP);
          knownCount++;
        }
      }

      const avgTotalAvgDailyCSP =
        knownTotalAvgs.length > 0
          ? CountSizePriceOps.divideBy(
              CountSizePriceOps.sumAll(knownTotalAvgs),
              knownTotalAvgs.length,
            )
          : { ...baseCountSizePrice };

      teamStatsCache.set(servCodeId, {
        teamAvgCSP,
        teamMaxCSP,
        knownCount,
        totalAssigned: assignedEmployees.length,
        avgTotalAvgDailyCSP,
      });
    }

    for (const employee of employeeMap.values()) {
      const employeeLookback = lookbackMap.get(employee.employeeId);

      // Get totalAvgDailyCSP from any programType stats entry (it's cross-programType)
      let totalAvgDailyCSP: CountSizePrice | null = null;
      if (employeeLookback) {
        for (const stats of employeeLookback.values()) {
          if (stats?.totalAvgDailyCSP) {
            totalAvgDailyCSP = stats.totalAvgDailyCSP;
            break;
          }
        }
      }

      const byServCode = new Map<string, EmployeeCascadeEntry>();

      // Build per-servCode data for this employee's priority list
      type ServCodeSimData = {
        servCodeId: string;
        openDate: string;
        closeDate: string;
        pool: CountSizePrice; // employee's weighted share of activeAsapCSP
        dailyRate: CountSizePrice;
        maxDailyRate: CountSizePrice;
        isEstimated: boolean;
      };

      const simDataList: ServCodeSimData[] = [];

      for (const servCodeId of employee.servCodeIds) {
        const perDay = perDayMap.get(servCodeId);
        if (!perDay) continue;

        const programTypeKey =
          perDay.servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
        const stats = employeeLookback?.get(programTypeKey) ?? null;
        const teamStats = teamStatsCache.get(servCodeId);
        if (!teamStats) continue;

        const {
          teamAvgCSP,
          teamMaxCSP,
          knownCount,
          totalAssigned,
          avgTotalAvgDailyCSP,
        } = teamStats;

        let dailyRate: CountSizePrice;
        let maxDailyRate: CountSizePrice;
        let isEstimated: boolean;
        let pool: CountSizePrice;

        if (stats) {
          dailyRate = stats.avgDailyCSP;
          maxDailyRate = stats.maxDailyCSP;
          isEstimated = false;

          // Weighted share: employee's proportion of the team's avg capacity
          const activeAsapCSP = perDay.activeAsapCSP;
          pool = {
            count:
              teamAvgCSP.count > 0
                ? activeAsapCSP.count *
                  (stats.avgDailyCSP.count / teamAvgCSP.count)
                : 0,
            size:
              teamAvgCSP.size > 0
                ? activeAsapCSP.size *
                  (stats.avgDailyCSP.size / teamAvgCSP.size)
                : 0,
            price:
              teamAvgCSP.price > 0
                ? activeAsapCSP.price *
                  (stats.avgDailyCSP.price / teamAvgCSP.price)
                : 0,
            rev:
              teamAvgCSP.rev > 0
                ? activeAsapCSP.rev * (stats.avgDailyCSP.rev / teamAvgCSP.rev)
                : 0,
          };
        } else {
          // Estimated: use team average rate for known employees
          isEstimated = true;
          if (knownCount > 0) {
            dailyRate = CountSizePriceOps.divideBy(teamAvgCSP, knownCount);
            maxDailyRate = CountSizePriceOps.divideBy(teamMaxCSP, knownCount);
          } else {
            dailyRate = { count: 1, size: 1, price: 1, rev: 1 };
            maxDailyRate = { count: 1, size: 1, price: 1, rev: 1 };
          }
          // Even split of the pool
          pool = CountSizePriceOps.divideBy(
            perDay.activeAsapCSP,
            Math.max(totalAssigned, 1),
          );
        }

        // Determine open/close dates
        let openDate: string;
        let closeDate: string;

        if (perDay.servCode.alwaysAsap) {
          openDate = today;
          closeDate = today;
        } else if (dateRanges.isValidDateRange(perDay.servCode.dateRange)) {
          // Per-employee openDate: the later of the servCode pool start and the
          // day after this employee's latest printed route (they're already booked).
          const employeeLatestPrinted = employeeLatestPrintedDate.get(
            employee.employeeId,
          );
          const employeeAvailableFrom = employeeLatestPrinted
            ? dateStrings.nextWeekdayAfter(employeeLatestPrinted)
            : null;

          // projectionStartDate is the team-level pool start (day after the latest
          // printed route across ALL employees). Only use it as a floor for employees
          // who themselves have printed routes — an unrouted employee is available today.
          const servCodePoolStart = employeeLatestPrinted
            ? (perDay.projectionStartDate ??
               (today > perDay.servCode.dateRange.min
                 ? today
                 : perDay.servCode.dateRange.min))
            : (today > perDay.servCode.dateRange.min
               ? today
               : perDay.servCode.dateRange.min);

          openDate =
            employeeAvailableFrom && employeeAvailableFrom > servCodePoolStart
              ? employeeAvailableFrom
              : servCodePoolStart;

          // Overdue fix: if the servCode's window has passed but work remains,
          // project a new close date based on how long the team needs to drain the pool.
          const isOverdue = today > perDay.servCode.dateRange.max;
          if (
            isOverdue &&
            perDay.activeAsapCSP.price > 0 &&
            teamStats.teamAvgCSP.price > 0
          ) {
            const daysNeeded = Math.ceil(
              perDay.activeAsapCSP.price / teamStats.teamAvgCSP.price,
            );
            closeDate = dateStrings.addWeekdays(today, daysNeeded);
          } else if (isOverdue) {
            // No lookback data — treat as due immediately so it gets highest priority
            closeDate = today;
          } else {
            closeDate = perDay.servCode.dateRange.max;
          }
        } else {
          continue; // No valid date range and not alwaysAsap — skip
        }

        simDataList.push({
          servCodeId,
          openDate,
          closeDate,
          pool,
          dailyRate,
          maxDailyRate,
          isEstimated,
        });
      }

      // Collect all boundary dates for the interval simulation
      const boundarySet = new Set<string>([today]);
      for (const sim of simDataList) {
        boundarySet.add(sim.openDate);
        boundarySet.add(sim.closeDate);
      }
      const boundaries = [...boundarySet].sort();

      // Track remaining pool per servCode
      const remaining = new Map<string, CountSizePrice>();
      for (const sim of simDataList) {
        remaining.set(sim.servCodeId, { ...sim.pool });
      }

      // Track accumulated contributions
      const contributed = new Map<string, CountSizePrice>();
      const availableFrom = new Map<string, string>();
      for (const sim of simDataList) {
        contributed.set(sim.servCodeId, { ...baseCountSizePrice });
      }

      // Interval-by-interval simulation: drain highest-priority open servCode
      for (let i = 0; i < boundaries.length - 1; i++) {
        const intervalStart = boundaries[i];
        const intervalEnd = boundaries[i + 1];

        const intervalWeekdays = Math.max(
          0,
          dateRanges.countWeekdays({ min: intervalStart, max: intervalEnd }) -
            1,
        );
        if (intervalWeekdays <= 0) continue;

        // Find highest-priority open servCode with remaining work
        for (const sim of simDataList) {
          if (sim.openDate > intervalStart || sim.closeDate < intervalEnd)
            continue;

          const rem = remaining.get(sim.servCodeId)!;
          if (rem.count <= 0 && rem.size <= 0 && rem.price <= 0 && rem.rev <= 0)
            continue;

          // Record first time this servCode is worked
          if (!availableFrom.has(sim.servCodeId)) {
            availableFrom.set(sim.servCodeId, intervalStart);
          }

          // Drain: min(rate × days, remaining) per dimension
          const drained: CountSizePrice = {
            count: Math.min(sim.dailyRate.count * intervalWeekdays, rem.count),
            size: Math.min(sim.dailyRate.size * intervalWeekdays, rem.size),
            price: Math.min(sim.dailyRate.price * intervalWeekdays, rem.price),
            rev: Math.min(sim.dailyRate.rev * intervalWeekdays, rem.rev),
          };

          const prev = contributed.get(sim.servCodeId)!;
          contributed.set(sim.servCodeId, CountSizePriceOps.sum(prev, drained));

          remaining.set(sim.servCodeId, {
            count: Math.max(0, rem.count - drained.count),
            size: Math.max(0, rem.size - drained.size),
            price: Math.max(0, rem.price - drained.price),
            rev: Math.max(0, rem.rev - drained.rev),
          });

          break; // Only one servCode worked per interval
        }
      }

      // Assemble EmployeeCascadeEntry per servCode
      for (const sim of simDataList) {
        const contributedCSP = contributed.get(sim.servCodeId) ?? {
          ...baseCountSizePrice,
        };
        const from = availableFrom.get(sim.servCodeId);

        // fractionConsumed: contributedCSP / totalAvgDailyCSP
        // For estimated employees, use avgTotalAvgDailyCSP of known co-workers
        const teamStats = teamStatsCache.get(sim.servCodeId)!;
        const effectiveTotalAvg =
          totalAvgDailyCSP ??
          (teamStats.knownCount > 0 ? teamStats.avgTotalAvgDailyCSP : null);

        const fractionConsumed = effectiveTotalAvg
          ? safeDivideCSP(contributedCSP, effectiveTotalAvg)
          : null;

        byServCode.set(sim.servCodeId, {
          availableFrom: from,
          contributedCSP,
          dailyRate: sim.dailyRate,
          maxDailyRate: sim.maxDailyRate,
          fractionConsumed,
          isEstimated: sim.isEstimated,
        });
      }

      results.push({ employee, totalAvgDailyCSP, byServCode });
    }

    return results;
  },
);

const selectEmployeeCascadeMap = createSelector(
  [selectEmployeeCascadeResults],
  (results): Map<string, EmployeeCascadeResult> =>
    new Grouper(results).toUniqueMap((r) => r.employee.employeeId),
);

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const cascadeSelect = {
  // Slice selectors
  lookbackConfig: selectLookbackConfig,
  mainDate: selectMainDate,
  employeeDates: selectEmployeeDates,
  paceTolerance: selectPaceTolerance,
  showUpcoming: selectShowUpcoming,
  rateMode: selectRateMode,
  // Layer 2
  employeeLookbackMap: selectEmployeeLookbackMap,
  // Layer 3
  employeeCascadeResults: selectEmployeeCascadeResults,
  employeeCascadeMap: selectEmployeeCascadeMap,
};
