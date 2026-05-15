import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/rawPaceSelect";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  NULL_PROGRAM_TYPE_KEY,
  LookbackStats,
  accumulateDailyProduction,
  computeLookbackStats,
  getValidProductionDates,
} from "@/app/bizPlan/pace/_lib/employeeLookbackUtils";
import {
  EmployeeAllocation,
  EmployeeCardData,
  EmployeeCascadeEntry,
  EmployeeCascadeResult,
  OVERLOAD_EPSILON,
  PaceCategory,
  ProgCodePace,
  ProgCodeProjectedCompletion,
  ServCodePace,
  ServCodePaceDelta,
} from "@/app/bizPlan/pace/PaceTypesRefactor";
import { MatrixDisplayConfig } from "@/app/bizPlan/pace/paceSlice";
import { LookbackConfig } from "@/app/bizPlan/pace/PaceTypesRefactor";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { RawServCodePacePerDay } from "@/app/bizPlan/pace/RawPaceTypes";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

// ---------------------------------------------------------------------------
// Slice selectors
// ---------------------------------------------------------------------------

const selectLookbackConfig = (state: AppState): LookbackConfig =>
  state.pace.lookbackConfig;

const selectMatrixDisplayConfig = (state: AppState): MatrixDisplayConfig =>
  state.pace.matrixDisplayConfig;

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

const selectLatestAssignmentDate = createSelector(
  [centralSelect.services],
  (services) => {
    return services
      .map((serv) => serv.lastAssigned?.schedDate ?? "")
      .sort((a, b) => b.localeCompare(a))[0];
  },
);

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
// Layer 4 — ServCode Assembly
// ---------------------------------------------------------------------------

const selectServCodePaces = createSelector(
  [
    rawPaceSelect.rawServCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    selectEmployeeCascadeMap,
  ],
  (rawPaces, perDayMap, cascadeMap): ServCodePace[] => {
    return rawPaces.map((raw) => {
      const {
        servCode,
        finishedCSP,
        finishedRate,
        unfinishedCSP,
        unfinishedRate,
        category,
        daysRemaining,
      } = raw;
      const servCodeId = servCode.servCodeId;
      const perDay = perDayMap.get(servCodeId);
      const unfinishedDayCount =
        perDay?.unfinishedDayCount ?? Math.max(daysRemaining, 1);

      const employeeShares = servCode.assignedTo.map((employee) => {
        const cascadeResult = cascadeMap.get(employee.employeeId);
        const entry = cascadeResult?.byServCode.get(servCodeId);

        if (entry) {
          return { employee, ...entry };
        }

        // Fallback: employee assigned but not in cascade (no priority list entry)
        return {
          employee,
          availableFrom: undefined,
          contributedCSP: { ...baseCountSizePrice },
          dailyRate: { ...baseCountSizePrice },
          maxDailyRate: { ...baseCountSizePrice },
          fractionConsumed: null,
          isEstimated: true,
        };
      });

      // teamExpectedCSP: sum of contributedCSP normalized to per-day
      const totalContributed = CountSizePriceOps.sumAll(
        employeeShares.map((s) => s.contributedCSP),
      );
      const teamExpectedCSP = CountSizePriceOps.divideBy(
        totalContributed,
        unfinishedDayCount,
      );

      // teamAvgCapacity: sum of dailyRate across all employees
      const teamAvgCapacity = CountSizePriceOps.sumAll(
        employeeShares.map((s) => s.dailyRate),
      );

      const paceDelta = CountSizePriceOps.subtract(
        teamExpectedCSP,
        unfinishedRate,
      );
      const paceDeltaPct = safeDivideCSP(paceDelta, unfinishedRate);

      return {
        servCode,
        daysRemaining,
        category,
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
        employeeShares,
        teamExpectedCSP,
        teamAvgCapacity,
        paceDelta,
        paceDeltaPct,
      } satisfies ServCodePace;
    });
  },
);

const selectServCodePaceMap = createSelector([selectServCodePaces], (paces) =>
  new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

const selectProgCodePaces = createSelector(
  [progServSelect.progCodes, selectServCodePaceMap],
  (progCodes, paceMap): ProgCodePace[] =>
    progCodes.map((progCode) => {
      const servCodePacesMaybe = progCode.servCodes.map((sc) =>
        paceMap.get(sc.servCodeId),
      );
      const servCodePaces = typeGuard.definedArray(servCodePacesMaybe);

      const category: PaceCategory =
        servCodePaces.length > 0
          ? mostUrgentCategory(servCodePaces.map((p) => p.category))
          : "notSet";

      const unfinishedCSP = CountSizePriceOps.sumAll(
        servCodePaces.map((p) => p.unfinishedCSP),
      );
      const finishedCSP = CountSizePriceOps.sumAll(
        servCodePaces.map((p) => p.finishedCSP),
      );

      return { progCode, servCodePaces, category, unfinishedCSP, finishedCSP };
    }),
);

const selectUrgentServCodePaces = createSelector(
  [selectServCodePaces],
  (paces) =>
    paces.filter(
      (p) =>
        (p.category === "asap" || p.category === "overdue") &&
        p.unfinishedCSP.count > 0,
    ),
);

// selectEmployeeCardData needs servCode entities — build from servCodePaceMap
const selectEmployeeCardDataFull = createSelector(
  [
    selectEmployeeCascadeResults,
    selectServCodePaceMap,
    assignmentPlanSelect.assignmentsByEmployeeId,
  ],
  (
    cascadeResults,
    servCodePaceMap,
    assignmentsByEmployeeId,
  ): EmployeeCardData[] => {
    const result: EmployeeCardData[] = [];

    for (const cascadeResult of cascadeResults) {
      const { employee, totalAvgDailyCSP, byServCode } = cascadeResult;
      const priorityOrder =
        assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      const allocations: EmployeeAllocation[] = [];

      for (const [servCodeId, entry] of byServCode) {
        const pace = servCodePaceMap.get(servCodeId);
        if (!pace) continue;

        allocations.push({
          servCode: pace.servCode,
          fractionConsumed: entry.fractionConsumed,
          expectedCSP: entry.contributedCSP,
          avgDailyCSP: entry.isEstimated ? null : entry.dailyRate,
          maxDailyCSP: entry.isEstimated ? null : entry.maxDailyRate,
        });
      }

      if (allocations.length === 0) continue;

      // Sort by priority order
      allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });

      const fractionValues = allocations
        .map((a) => a.fractionConsumed)
        .filter((f): f is CountSizePrice => f !== null);

      const totalFractionConsumed =
        fractionValues.length > 0
          ? CountSizePriceOps.sumAll(fractionValues)
          : null;

      const freeCapacityFraction = totalFractionConsumed
        ? {
            count: Math.max(0, 1 - totalFractionConsumed.count),
            size: Math.max(0, 1 - totalFractionConsumed.size),
            price: Math.max(0, 1 - totalFractionConsumed.price),
            rev: Math.max(0, 1 - totalFractionConsumed.rev),
          }
        : null;

      const isOverloaded = totalFractionConsumed
        ? totalFractionConsumed.count > 1 + OVERLOAD_EPSILON ||
          totalFractionConsumed.size > 1 + OVERLOAD_EPSILON ||
          totalFractionConsumed.price > 1 + OVERLOAD_EPSILON ||
          totalFractionConsumed.rev > 1 + OVERLOAD_EPSILON
        : false;

      result.push({
        employee,
        totalAvgDailyCSP,
        allocations,
        totalFractionConsumed,
        freeCapacityFraction,
        // isOverloaded,
      });
    }

    return result.sort((a, b) =>
      a.employee.name.localeCompare(b.employee.name),
    );
  },
);

// ---------------------------------------------------------------------------
// Layer 5 — Delta Projection (shared pool drain)
// ---------------------------------------------------------------------------

function computePoolDrainDate(
  employeeAvailability: { availableFrom: string; rate: number }[],
  pool: number,
  projectionStart: string,
  closeDate: string,
): string | null {
  if (pool <= 0) return projectionStart;
  if (employeeAvailability.length === 0) return null;

  const boundarySet = new Set<string>([projectionStart, closeDate]);
  for (const { availableFrom } of employeeAvailability) {
    if (availableFrom >= projectionStart) boundarySet.add(availableFrom);
  }
  const boundaries = [...boundarySet].sort();

  let remaining = pool;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const intervalStart = boundaries[i];
    const intervalEnd = boundaries[i + 1];

    let intervalRate = 0;
    for (const { availableFrom, rate } of employeeAvailability) {
      if (availableFrom <= intervalStart) intervalRate += rate;
    }

    if (intervalRate <= 0) continue;

    const intervalWeekdays = Math.max(
      0,
      dateRanges.countWeekdays({ min: intervalStart, max: intervalEnd }) - 1,
    );
    if (intervalWeekdays <= 0) continue;

    const produced = intervalRate * intervalWeekdays;

    if (produced >= remaining) {
      const daysNeeded = remaining / intervalRate;
      return dateStrings.addWeekdays(intervalStart, daysNeeded);
    }

    remaining -= produced;
  }

  // Pool not exhausted — project beyond deadline
  let finalRate = 0;
  for (const { availableFrom, rate } of employeeAvailability) {
    if (availableFrom <= closeDate) finalRate += rate;
  }
  if (finalRate <= 0) return null;

  const daysNeeded = remaining / finalRate;
  return dateStrings.addWeekdays(closeDate, daysNeeded);
}

const selectServCodePaceDeltaMap = createSelector(
  [
    selectServCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    selectEmployeeCascadeMap,
  ],
  (servCodePaces, perDayMap, cascadeMap): Map<string, ServCodePaceDelta> => {
    const today = dateStrings.today();
    const result = new Map<string, ServCodePaceDelta>();

    for (const pace of servCodePaces) {
      const { servCode } = pace;
      const servCodeId = servCode.servCodeId;
      const dateRange = servCode.dateRange;
      const perDay = perDayMap.get(servCodeId);

      if (
        !perDay ||
        (!servCode.alwaysAsap && !dateRanges.isValidDateRange(dateRange))
      ) {
        result.set(servCodeId, {
          servCodeId,
          dateRange,
          projectedEndDate: null,
          deltaDays: null,
          deltaDaysCSP: null,
        });
        continue;
      }

      const openDate = servCode.alwaysAsap
        ? today
        : (perDay.projectionStartDate ??
          (today > dateRange.min ? today : dateRange.min));
      const closeDate = servCode.alwaysAsap ? today : dateRange.max;

      const availabilityCount: { availableFrom: string; rate: number }[] = [];
      const availabilitySize: { availableFrom: string; rate: number }[] = [];
      const availabilityPrice: { availableFrom: string; rate: number }[] = [];

      for (const employee of servCode.assignedTo) {
        const cascadeResult = cascadeMap.get(employee.employeeId);
        const entry = cascadeResult?.byServCode.get(servCodeId);
        if (!entry) continue;

        const availFrom = entry.availableFrom ?? openDate;

        if (entry.dailyRate.count > 0)
          availabilityCount.push({
            availableFrom: availFrom,
            rate: entry.dailyRate.count,
          });
        if (entry.dailyRate.size > 0)
          availabilitySize.push({
            availableFrom: availFrom,
            rate: entry.dailyRate.size,
          });
        if (entry.dailyRate.price > 0)
          availabilityPrice.push({
            availableFrom: availFrom,
            rate: entry.dailyRate.price,
          });
      }

      const pool = perDay.activeAsapCSP;

      const projectedEndCount = computePoolDrainDate(
        availabilityCount,
        pool.count,
        openDate,
        closeDate,
      );
      const projectedEndSize = computePoolDrainDate(
        availabilitySize,
        pool.size,
        openDate,
        closeDate,
      );
      const projectedEndPrice = computePoolDrainDate(
        availabilityPrice,
        pool.price,
        openDate,
        closeDate,
      );

      const projectedEndDate = projectedEndCount;
      const deltaDays =
        projectedEndDate != null && pool.count > 0
          ? dateRanges.weekdaysBetween(closeDate, projectedEndDate)
          : null;

      const deltaDaysCSP = {
        count:
          projectedEndCount != null && pool.count > 0
            ? dateRanges.weekdaysBetween(closeDate, projectedEndCount)
            : null,
        size:
          projectedEndSize != null && pool.size > 0
            ? dateRanges.weekdaysBetween(closeDate, projectedEndSize)
            : null,
        price:
          projectedEndPrice != null && pool.price > 0
            ? dateRanges.weekdaysBetween(closeDate, projectedEndPrice)
            : null,
      };

      result.set(servCodeId, {
        servCodeId,
        dateRange,
        projectedEndDate: projectedEndDate ?? null,
        deltaDays,
        deltaDaysCSP,
      } satisfies ServCodePaceDelta);
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 5b — ProgCode Projected Completion Map
// ---------------------------------------------------------------------------

/**
 * Returns the projected completion date for each ProgCode — the latest projected end date
 * across all its servCodes. When a servCode has no team lookback data, falls back to
 * dateRange.max (assume on-time completion). `isEstimated` is true when any fallback was used.
 */
const selectProgCodeProjectedCompletionMap = createSelector(
  [selectProgCodePaces, selectServCodePaceDeltaMap],
  (
    progCodePaces,
    deltaMap,
  ): Map<string, ProgCodeProjectedCompletion> => {
    const result = new Map<string, ProgCodeProjectedCompletion>();

    for (const progCodePace of progCodePaces) {
      const dates: string[] = [];
      let anyEstimated = false;

      for (const sp of progCodePace.servCodePaces) {
        const delta = deltaMap.get(sp.servCode.servCodeId);
        if (delta?.projectedEndDate != null) {
          dates.push(delta.projectedEndDate);
        } else if (sp.servCode.dateRange.max) {
          // No team data — fall back to the planned end date (assume on-time)
          anyEstimated = true;
          dates.push(sp.servCode.dateRange.max);
        }
      }

      result.set(progCodePace.progCode.progCodeId, {
        date: dates.length > 0 ? [...dates].sort().at(-1)! : null,
        isEstimated: anyEstimated,
      });
    }

    return result;
  },
);

const selectMatrixDeltaDaysBounds = createSelector(
  [selectServCodePaceDeltaMap],
  (deltaMap): [number, number] => {
    let min = 0;
    let max = 0;
    for (const { deltaDays } of deltaMap.values()) {
      if (deltaDays == null) continue;
      if (deltaDays < min) min = deltaDays;
      if (deltaDays > max) max = deltaDays;
    }
    return [min, max];
  },
);

const selectMatrixFilteredSortedProgCodePaces = createSelector(
  [
    selectProgCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    rawPaceSelect.rawServCodePacesPerDayPerEmployeeMap,
    selectServCodePaceDeltaMap,
    selectMatrixDisplayConfig,
  ],
  (
    progCodePaces,
    perDayMap,
    perDayPerEmployeeMap,
    deltaMap,
    config,
  ): ProgCodePace[] => {
    const {
      sortKey,
      filterAssigned,
      filterCategories,
      filterDeltaDays,
      cspDisplay,
    } = config;

    function getServCodeCsp(servCodeId: string): CountSizePrice {
      if (cspDisplay === "perDay") {
        return (
          perDayMap.get(servCodeId)?.unfinishedPerDay ?? {
            ...baseCountSizePrice,
          }
        );
      }
      if (cspDisplay === "perDayPerEmployee") {
        return (
          perDayPerEmployeeMap.get(servCodeId)?.unfinishedPerDayPerEmployee ?? {
            ...baseCountSizePrice,
          }
        );
      }
      return (
        perDayMap.get(servCodeId)?.activeAsapCSP ?? { ...baseCountSizePrice }
      );
    }

    const filtered = progCodePaces.filter((p) => {
      if (filterAssigned !== "all") {
        const totalAssigned = p.servCodePaces.reduce(
          (sum, sp) => sum + sp.servCode.assignedTo.length,
          0,
        );
        if (filterAssigned === "withAssigned" && totalAssigned === 0)
          return false;
        if (filterAssigned === "withoutAssigned" && totalAssigned > 0)
          return false;
      }

      if (filterCategories.length > 0) {
        const hasMatchingCategory = p.servCodePaces.some((sp) =>
          filterCategories.includes(sp.category),
        );
        if (!hasMatchingCategory) return false;
      }

      if (filterDeltaDays != null) {
        const [minDelta, maxDelta] = filterDeltaDays;
        const anyInRange = p.servCodePaces.some((sp) => {
          const delta = deltaMap.get(sp.servCode.servCodeId)?.deltaDays;
          if (delta == null) return false;
          return delta >= minDelta && delta <= maxDelta;
        });
        if (!anyInRange) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "dateRange") {
        const minA =
          a.servCodePaces
            .map((p) => p.servCode.dateRange.min ?? "")
            .filter(Boolean)
            .sort()[0] ?? "";
        const minB =
          b.servCodePaces
            .map((p) => p.servCode.dateRange.min ?? "")
            .filter(Boolean)
            .sort()[0] ?? "";
        if (minA !== minB) return minA.localeCompare(minB);
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      if (sortKey === "assignedCount") {
        const countA = new Set(
          a.servCodePaces.flatMap((sp) =>
            sp.servCode.assignedTo.map((e) => e.employeeId),
          ),
        ).size;
        const countB = new Set(
          b.servCodePaces.flatMap((sp) =>
            sp.servCode.assignedTo.map((e) => e.employeeId),
          ),
        ).size;
        if (countA !== countB) return countB - countA;
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      const dim = sortKey as "count" | "size" | "price" | "rev";
      const sumA = a.servCodePaces.reduce(
        (s, sp) => s + getServCodeCsp(sp.servCode.servCodeId)[dim],
        0,
      );
      const sumB = b.servCodePaces.reduce(
        (s, sp) => s + getServCodeCsp(sp.servCode.servCodeId)[dim],
        0,
      );
      if (sumA !== sumB) return sumB - sumA;
      return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
    });
  },
);

// ---------------------------------------------------------------------------
// Employee view selectors (previously in employeePaceSelect.ts)
// ---------------------------------------------------------------------------

function makeSelectEffectiveDate(employeeId: string) {
  return createSelector(
    [selectMainDate, selectEmployeeDates],
    (mainDate, employeeDates) => employeeDates[employeeId] ?? mainDate,
  );
}

function isWeekend(date: string): boolean {
  const day = new Date(date).getUTCDay();
  return day === 0 || day === 6;
}

function countWeekdaysLocal(from: string, to: string): number {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (toMs < fromMs) return 0;
  let count = 0;
  let cur = fromMs;
  while (cur <= toMs) {
    const day = new Date(cur).getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur += 24 * 60 * 60 * 1000;
  }
  return count;
}

function weekdayIndexOf(date: string, rangeStart: string): number {
  if (isWeekend(date)) return -1;
  return countWeekdaysLocal(rangeStart, date) - 1;
}

function nextDay(date: string): string {
  const ms = new Date(date).getTime() + 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function nearestWeekday(date: string): string {
  let d = date;
  while (isWeekend(d)) d = nextDay(d);
  return d;
}

export const PX_PER_DAY = 16;

type WeekdayBounds = {
  min: string;
  max: string;
  weekdayCount: number;
  trackHeightPx: number;
};

const selectDateBounds = createSelector([selectServCodePaces], (paces) => {
  const dates: string[] = [];
  for (const pace of paces) {
    const { dateRange } = pace.servCode;
    if (dateRange.min) dates.push(dateRange.min);
    if (dateRange.max) dates.push(dateRange.max);
  }
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  return { min: sorted[0], max: sorted[sorted.length - 1] };
});

const selectWeekdayBounds = createSelector(
  [selectDateBounds],
  (bounds): WeekdayBounds | null => {
    if (!bounds) return null;
    const weekdayCount = countWeekdaysLocal(bounds.min, bounds.max);
    return {
      min: bounds.min,
      max: bounds.max,
      weekdayCount,
      trackHeightPx: Math.max(weekdayCount * PX_PER_DAY, PX_PER_DAY),
    };
  },
);

type DateTick = {
  date: string;
  labels: string[];
  weekdayIndex: number;
};

const selectDateTicks = createSelector(
  [selectServCodePaces, selectWeekdayBounds],
  (paces, weekdayBounds): DateTick[] => {
    if (!weekdayBounds) return [];

    const startsByDate = new Map<string, string[]>();
    const finishesByDate = new Map<string, string[]>();

    function addTo(
      map: Map<string, string[]>,
      date: string | null | undefined,
      id: string,
    ) {
      if (!date) return;
      const effectiveDate = nearestWeekday(date);
      const existing = map.get(effectiveDate) ?? [];
      existing.push(id);
      map.set(effectiveDate, existing);
    }

    for (const pace of paces) {
      const id = pace.servCode.servCodeId;
      const { dateRange } = pace.servCode;
      addTo(startsByDate, dateRange.min, id);
      addTo(finishesByDate, dateRange.max, id);
    }

    const allDates = new Set([
      ...startsByDate.keys(),
      ...finishesByDate.keys(),
    ]);

    return [...allDates]
      .sort()
      .map((date) => {
        const starts = startsByDate.get(date) ?? [];
        const finishes = finishesByDate.get(date) ?? [];
        const labels: string[] = [];
        if (starts.length > 0) labels.push(`Start ${starts.join(", ")}`);
        if (finishes.length > 0) labels.push(`Finish ${finishes.join(", ")}`);
        return {
          date,
          labels,
          weekdayIndex: weekdayIndexOf(date, weekdayBounds.min),
        };
      })
      .filter((t) => t.weekdayIndex >= 0);
  },
);

function weekdaysRemainingLocal(from: string, to: string): number {
  if (to < from) return 1;
  return Math.max(1, dateRanges.countWeekdays({ min: from, max: to }));
}

function isServCodeActiveOn(servCode: ServCodeDeep, date: string): boolean {
  if (servCode.alwaysAsap) return true;
  const { min, max } = servCode.dateRange;
  if (!min || !max) return false;
  return date >= min && date <= max;
}

function weekdaysAheadOf(date: string): number {
  const today = dateStrings.today();
  if (date <= today) return 0;
  return Math.max(0, dateRanges.countWeekdays({ min: today, max: date }) - 1);
}

function projectUnfinishedCSP(
  pace: ServCodePace,
  daysAhead: number,
): CountSizePrice {
  if (daysAhead <= 0) return pace.unfinishedCSP;
  const projected = CountSizePriceOps.subtract(
    pace.unfinishedCSP,
    CountSizePriceOps.multiply(pace.teamExpectedCSP, daysAhead),
  );
  return {
    count: Math.max(0, projected.count),
    size: Math.max(0, projected.size),
    price: Math.max(0, projected.price),
    rev: Math.max(0, projected.rev),
  };
}

type EmployeeAllocationsInput = {
  employeeId: string;
  date: string;
};

function makeSelectProjectedAllocations({
  employeeId,
  date,
}: EmployeeAllocationsInput) {
  return createSelector(
    [
      selectServCodePaces,
      selectEmployeeCascadeMap,
      assignmentPlanSelect.assignmentsByEmployeeId,
      selectRateMode,
    ],
    (
      servCodePaces,
      cascadeMap,
      assignmentsByEmployeeId,
      rateMode,
    ): EmployeeAllocation[] => {
      const priorityOrder =
        assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      const cascadeResult = cascadeMap.get(employeeId);
      const totalAvgDailyCSP = cascadeResult?.totalAvgDailyCSP ?? null;

      const allocations: EmployeeAllocation[] = [];

      for (const pace of servCodePaces) {
        // Pass overdue servCodes with remaining work even when date > dateRange.max —
        // the cascade's effective close date extends them, so they should still display.
        const isActive = isServCodeActiveOn(pace.servCode, date);
        const isOverdueWithWork =
          !isActive &&
          pace.servCode.dateRange.max != null &&
          date > pace.servCode.dateRange.max &&
          pace.unfinishedCSP.count > 0;
        if (!isActive && !isOverdueWithWork) continue;

        const share = pace.employeeShares.find(
          (s) => s.employee.employeeId === employeeId,
        );
        if (!share) continue;

        const entry = cascadeResult?.byServCode.get(pace.servCode.servCodeId);

        // Cascade gate: never available or not yet available
        const availableFrom = entry?.availableFrom;
        const isInPriorityList = priorityOrder.includes(
          pace.servCode.servCodeId,
        );
        const neverAvailable = isInPriorityList && availableFrom === undefined;
        const notYetAvailable =
          availableFrom !== undefined && date < availableFrom;

        if (neverAvailable || notYetAvailable) {
          allocations.push({
            servCode: pace.servCode,
            expectedCSP: { ...baseCountSizePrice },
            avgDailyCSP: share.isEstimated ? null : share.dailyRate,
            maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
            fractionConsumed: null,
          });
          continue;
        }

        // Target CSP = min(employee's daily rate, their proportional share of the demand rate).
        // This answers "what should this employee route today?" rather than "how much of the
        // pool did the cascade assign them?" The cascade's availableFrom gate (above) still
        // enforces the waterfall — LR2 only gets a target once LR1 is exhausted.
        const effectiveMax = isOverdueWithWork
          ? date
          : (pace.servCode.dateRange.max ?? date);
        const daysLeft = Math.max(
          1,
          dateRanges.countWeekdays({ min: date, max: effectiveMax }),
        );
        const demandRate = CountSizePriceOps.divideBy(
          pace.unfinishedCSP,
          daysLeft,
        );

        let expectedCSP: CountSizePrice;
        if (entry && !entry.isEstimated) {
          // Employee's proportional share of the demand rate, weighted by their daily rate
          const teamAvgCSP = CountSizePriceOps.sumAll(
            pace.employeeShares
              .filter((s) => !s.isEstimated)
              .map((s) => s.dailyRate),
          );
          const employeeDemandShare: CountSizePrice = {
            count:
              teamAvgCSP.count > 0
                ? demandRate.count * (entry.dailyRate.count / teamAvgCSP.count)
                : 0,
            size:
              teamAvgCSP.size > 0
                ? demandRate.size * (entry.dailyRate.size / teamAvgCSP.size)
                : 0,
            price:
              teamAvgCSP.price > 0
                ? demandRate.price * (entry.dailyRate.price / teamAvgCSP.price)
                : 0,
            rev:
              teamAvgCSP.rev > 0
                ? demandRate.rev * (entry.dailyRate.rev / teamAvgCSP.rev)
                : 0,
          };

          // Use avg or max rate depending on rateMode toggle
          const capacityRate =
            rateMode === "max" ? entry.maxDailyRate : entry.dailyRate;

          // Target is the lesser of capacity and demand — don't suggest more than needed
          expectedCSP = minCSP(capacityRate, employeeDemandShare);
        } else {
          // Fallback for estimated employees: even split of demand rate
          const assignedCount = pace.employeeShares.length || 1;
          expectedCSP = CountSizePriceOps.divideBy(demandRate, assignedCount);
        }

        const fractionConsumed =
          totalAvgDailyCSP &&
          (totalAvgDailyCSP.count > 0 || totalAvgDailyCSP.size > 0)
            ? {
                count:
                  totalAvgDailyCSP.count > 0
                    ? expectedCSP.count / totalAvgDailyCSP.count
                    : 0,
                size:
                  totalAvgDailyCSP.size > 0
                    ? expectedCSP.size / totalAvgDailyCSP.size
                    : 0,
                price:
                  totalAvgDailyCSP.price > 0
                    ? expectedCSP.price / totalAvgDailyCSP.price
                    : 0,
                rev:
                  totalAvgDailyCSP.rev > 0
                    ? expectedCSP.rev / totalAvgDailyCSP.rev
                    : 0,
              }
            : null;

        allocations.push({
          servCode: pace.servCode,
          expectedCSP,
          avgDailyCSP: share.isEstimated ? null : share.dailyRate,
          maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
          fractionConsumed,
        });
      }

      return allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });
    },
  );
}

function makeSelectNotStartedAllocations({
  employeeId,
}: {
  employeeId: string;
}) {
  return createSelector(
    [
      selectServCodePaces,
      selectEmployeeCascadeMap,
      assignmentPlanSelect.assignmentsByEmployeeId,
    ],
    (
      servCodePaces,
      cascadeMap,
      assignmentsByEmployeeId,
    ): EmployeeAllocation[] => {
      const priorityOrder =
        assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      const cascadeResult = cascadeMap.get(employeeId);
      const totalAvgDailyCSP = cascadeResult?.totalAvgDailyCSP ?? null;
      const today = dateStrings.today();

      const allocations: EmployeeAllocation[] = [];

      for (const pace of servCodePaces) {
        if (pace.category !== "notStarted") continue;

        const share = pace.employeeShares.find(
          (s) => s.employee.employeeId === employeeId,
        );
        if (!share) continue;

        const entry = cascadeResult?.byServCode.get(pace.servCode.servCodeId);
        const availableFrom = entry?.availableFrom;

        if (availableFrom && today < availableFrom) {
          allocations.push({
            servCode: pace.servCode,
            expectedCSP: { ...baseCountSizePrice },
            avgDailyCSP: share.isEstimated ? null : share.dailyRate,
            maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
            fractionConsumed: null,
          });
          continue;
        }

        const daysLeft = weekdaysRemainingLocal(
          today,
          pace.servCode.dateRange.max ?? today,
        );
        const rateAsOfToday = CountSizePriceOps.divideBy(
          pace.unfinishedCSP,
          daysLeft || 1,
        );

        let expectedCSP = { ...baseCountSizePrice };
        if (!share.isEstimated && share.dailyRate) {
          const teamAvg = CountSizePriceOps.sumAll(
            pace.employeeShares
              .filter((s) => !s.isEstimated)
              .map((s) => s.dailyRate),
          );
          expectedCSP = {
            count:
              teamAvg.count > 0
                ? rateAsOfToday.count * (share.dailyRate.count / teamAvg.count)
                : 0,
            size:
              teamAvg.size > 0
                ? rateAsOfToday.size * (share.dailyRate.size / teamAvg.size)
                : 0,
            price:
              teamAvg.price > 0
                ? rateAsOfToday.price * (share.dailyRate.price / teamAvg.price)
                : 0,
            rev:
              teamAvg.rev > 0
                ? rateAsOfToday.rev * (share.dailyRate.rev / teamAvg.rev)
                : 0,
          };
        } else {
          const assignedCount = pace.employeeShares.length || 1;
          expectedCSP = CountSizePriceOps.divideBy(
            rateAsOfToday,
            assignedCount,
          );
        }

        const fractionConsumed =
          totalAvgDailyCSP &&
          (totalAvgDailyCSP.count > 0 || totalAvgDailyCSP.size > 0)
            ? {
                count:
                  totalAvgDailyCSP.count > 0
                    ? expectedCSP.count / totalAvgDailyCSP.count
                    : 0,
                size:
                  totalAvgDailyCSP.size > 0
                    ? expectedCSP.size / totalAvgDailyCSP.size
                    : 0,
                price:
                  totalAvgDailyCSP.price > 0
                    ? expectedCSP.price / totalAvgDailyCSP.price
                    : 0,
                rev:
                  totalAvgDailyCSP.rev > 0
                    ? expectedCSP.rev / totalAvgDailyCSP.rev
                    : 0,
              }
            : null;

        allocations.push({
          servCode: pace.servCode,
          expectedCSP,
          avgDailyCSP: share.isEstimated ? null : share.dailyRate,
          maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
          fractionConsumed,
        });
      }

      return allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });
    },
  );
}

type SegmentColor = "primary" | "accent" | "destructive";

type TimelineSegment = {
  from: string;
  to: string;
  color: SegmentColor;
};

const selectEmployeeUnfinishedShareMap = createSelector(
  [selectServCodePaces],
  (paces): Map<string, Map<string, CountSizePrice>> => {
    const result = new Map<string, Map<string, CountSizePrice>>();

    for (const pace of paces) {
      const teamAvg = pace.teamAvgCapacity;
      const assignedCount = pace.employeeShares.length || 1;

      for (const share of pace.employeeShares) {
        const employeeId = share.employee.employeeId;
        if (!result.has(employeeId)) result.set(employeeId, new Map());
        const byServCode = result.get(employeeId)!;

        let shareRemaining: CountSizePrice;
        if (!share.isEstimated && share.dailyRate) {
          shareRemaining = {
            count:
              teamAvg.count > 0
                ? pace.unfinishedCSP.count *
                  (share.dailyRate.count / teamAvg.count)
                : 0,
            size:
              teamAvg.size > 0
                ? pace.unfinishedCSP.size *
                  (share.dailyRate.size / teamAvg.size)
                : 0,
            price:
              teamAvg.price > 0
                ? pace.unfinishedCSP.price *
                  (share.dailyRate.price / teamAvg.price)
                : 0,
            rev:
              teamAvg.rev > 0
                ? pace.unfinishedCSP.rev * (share.dailyRate.rev / teamAvg.rev)
                : 0,
          };
        } else {
          shareRemaining = CountSizePriceOps.divideBy(
            pace.unfinishedCSP,
            assignedCount,
          );
        }

        byServCode.set(pace.servCode.servCodeId, shareRemaining);
      }
    }

    return result;
  },
);

function makeSelectEmployeeTimelineSegments(employeeId: string) {
  return createSelector(
    [
      selectServCodePaces,
      selectEmployeeCascadeMap,
      selectDateBounds,
      selectPaceTolerance,
    ],
    (
      servCodePaces,
      cascadeMap,
      dateBounds,
      paceTolerance,
    ): TimelineSegment[] => {
      if (!dateBounds) return [];

      const boundarySet = new Set<string>([dateBounds.min, dateBounds.max]);
      for (const pace of servCodePaces) {
        if (pace.servCode.dateRange.min)
          boundarySet.add(pace.servCode.dateRange.min);
        if (pace.servCode.dateRange.max)
          boundarySet.add(pace.servCode.dateRange.max);
      }
      const boundaries = [...boundarySet].sort();
      if (boundaries.length < 2) return [];

      const cascadeResult = cascadeMap.get(employeeId);
      const totalAvgDailyCSP = cascadeResult?.totalAvgDailyCSP ?? {
        ...baseCountSizePrice,
      };

      const segments: TimelineSegment[] = [];

      for (let i = 0; i < boundaries.length - 1; i++) {
        const from = boundaries[i];
        const to = boundaries[i + 1];

        const fromMs = new Date(from).getTime();
        const toMs = new Date(to).getTime();
        const midMs = (fromMs + toMs) / 2;
        const midDate = new Date(midMs).toISOString().slice(0, 10);

        const midDaysAhead = weekdaysAheadOf(midDate);
        let totalFraction = 0;

        for (const pace of servCodePaces) {
          if (!isServCodeActiveOn(pace.servCode, midDate)) continue;
          const share = pace.employeeShares.find(
            (s) => s.employee.employeeId === employeeId,
          );
          if (!share) continue;

          const daysLeft = pace.servCode.alwaysAsap
            ? 1
            : weekdaysRemainingLocal(
                midDate,
                pace.servCode.dateRange.max ?? midDate,
              );

          const projectedUnfinished = projectUnfinishedCSP(pace, midDaysAhead);
          const rateAsOfDate = CountSizePriceOps.divideBy(
            projectedUnfinished,
            daysLeft || 1,
          );

          let employeeRate = 0;
          if (
            !share.isEstimated &&
            share.dailyRate &&
            totalAvgDailyCSP.count > 0
          ) {
            const teamAvg = CountSizePriceOps.sumAll(
              pace.employeeShares
                .filter((s) => !s.isEstimated)
                .map((s) => s.dailyRate),
            );
            const employeeShare =
              teamAvg.count > 0
                ? rateAsOfDate.count * (share.dailyRate.count / teamAvg.count)
                : 0;
            employeeRate =
              totalAvgDailyCSP.count > 0
                ? employeeShare / totalAvgDailyCSP.count
                : 0;
          } else if (totalAvgDailyCSP.count > 0) {
            const assignedCount = pace.employeeShares.length || 1;
            employeeRate =
              rateAsOfDate.count / assignedCount / totalAvgDailyCSP.count;
          }

          totalFraction += employeeRate;
        }

        let color: SegmentColor;
        if (totalFraction > 1 + paceTolerance) {
          color = "destructive";
        } else if (totalFraction < 1 - paceTolerance) {
          color = "primary";
        } else {
          color = "accent";
        }

        segments.push({ from, to, color });
      }

      return segments;
    },
  );
}

// ---------------------------------------------------------------------------
// Layer 6 — Season Optimizer
//
// Uses existing cascade and delta selectors directly — no duplicate cascade logic.
// For each servCode:
//   proposedMin = cascade.availableFrom (when first employee starts it) for
//                 runsInSequence progCodes; currentRange.min otherwise.
//   proposedMax = addWeekdays(projectedEndDate, servCode.paddingDays)
// ---------------------------------------------------------------------------

/** One row of season optimizer output per servCode. */
export type SeasonOptimizedRange = {
  servCodeId: string;
  progCodeId: string;
  servCodeName: string;
  currentRange: TRange<string>;
  /** Proposed new start — unchanged for non-runsInSequence or already-started servCodes */
  proposedMin: string;
  /** Proposed new end — projectedEndDate + paddingDays, or currentRange.max if no data */
  proposedMax: string;
  projectedEndDate: string | null;
  paddingDays: number;
  runsInSequence: boolean;
  /** True when the servCode's pool has already started (openDate ≤ today) */
  isStarted: boolean;
  /** True when there's unscheduled work and a projected end date exists */
  hasWork: boolean;
};

const selectSeasonOptimizerConfig = (state: AppState) => state.pace.seasonOptimizerConfig;

const selectSeasonOptimizerResult = createSelector(
  [
    selectProgCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    selectServCodePaceDeltaMap,
    selectEmployeeCascadeMap,
  ],
  (progCodePaces, perDayMap, deltaMap, cascadeMap): SeasonOptimizedRange[] => {
    const today = dateStrings.today();
    const results: SeasonOptimizedRange[] = [];

    for (const progCodePace of progCodePaces) {
      const runsInSequence = progCodePace.progCode.runsInSequence;

      // For sequential progCodes: track the day after each servCode's proposedMax so the
      // next servCode's min is guaranteed to start AFTER the previous one ends.
      let sequentialCursor: string | null = null;

      for (const sp of progCodePace.servCodePaces) {
        const servCodeId = sp.servCode.servCodeId;
        const currentRange = sp.servCode.dateRange;
        const paddingDays = sp.servCode.paddingDays;
        const perDay = perDayMap.get(servCodeId);
        const delta = deltaMap.get(servCodeId);

        const openDate = perDay
          ? (perDay.projectionStartDate ?? (today > currentRange.min ? today : currentRange.min))
          : currentRange.min;

        const isStarted = openDate <= today;
        const projectedEndDate = delta?.projectedEndDate ?? null;
        const hasWork = projectedEndDate !== null && (perDay?.activeAsapCSP.price ?? 0) > 0;

        let proposedMin: string;
        if (isStarted || !runsInSequence) {
          proposedMin = currentRange.min;
          // Reset cursor when a started/independent servCode is encountered
          if (isStarted) sequentialCursor = null;
        } else {
          // Use cascade's first-worked date: the earliest availableFrom across assigned employees
          let earliest: string | null = null;
          for (const employee of sp.servCode.assignedTo) {
            const entry = cascadeMap.get(employee.employeeId)?.byServCode.get(servCodeId);
            if (entry?.availableFrom) {
              if (!earliest || entry.availableFrom < earliest) {
                earliest = entry.availableFrom;
              }
            }
          }
          const cascadeMin = earliest ?? openDate;
          // Ensure this servCode doesn't start before the previous sequential one ends
          proposedMin = sequentialCursor && sequentialCursor > cascadeMin
            ? sequentialCursor
            : cascadeMin;
        }

        const proposedMax = hasWork && projectedEndDate
          ? dateStrings.addWeekdays(projectedEndDate, paddingDays)
          : currentRange.max;

        // Advance sequential cursor past this servCode's proposed end
        if (runsInSequence && hasWork) {
          sequentialCursor = dateStrings.addWeekdays(proposedMax, 1);
        }

        results.push({
          servCodeId,
          progCodeId: progCodePace.progCode.progCodeId,
          servCodeName: sp.servCode.longName,
          currentRange,
          proposedMin,
          proposedMax,
          projectedEndDate,
          paddingDays,
          runsInSequence,
          isStarted,
          hasWork,
        });
      }
    }

    return results;
  },
);

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const paceSelect = {
  latestAssignmentDate: selectLatestAssignmentDate,
  // Layer 2
  employeeLookbackMap: selectEmployeeLookbackMap,
  // Layer 3
  employeeCascadeResults: selectEmployeeCascadeResults,
  employeeCascadeMap: selectEmployeeCascadeMap,
  // Layer 4
  servCodePaces: selectServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  progCodePaces: selectProgCodePaces,
  urgentServCodePaces: selectUrgentServCodePaces,
  employeeCardData: selectEmployeeCardDataFull,
  // Layer 5
  servCodePaceDeltaMap: selectServCodePaceDeltaMap,
  progCodeProjectedCompletionMap: selectProgCodeProjectedCompletionMap,
  matrixDeltaDaysBounds: selectMatrixDeltaDaysBounds,
  matrixFilteredSortedProgCodePaces: selectMatrixFilteredSortedProgCodePaces,
  // Slice selectors
  lookbackConfig: selectLookbackConfig,
  matrixDisplayConfig: selectMatrixDisplayConfig,
  mainDate: selectMainDate,
  employeeDates: selectEmployeeDates,
  paceTolerance: selectPaceTolerance,
  showUpcoming: selectShowUpcoming,
  rateMode: selectRateMode,
  // Employee view
  dateBounds: selectDateBounds,
  weekdayBounds: selectWeekdayBounds,
  dateTicks: selectDateTicks,
  employeeUnfinishedShareMap: selectEmployeeUnfinishedShareMap,
  // Layer 6 — Season Optimizer
  seasonOptimizerConfig: selectSeasonOptimizerConfig,
  seasonOptimizerResult: selectSeasonOptimizerResult,
  // Factory selectors
  makeEffectiveDate: makeSelectEffectiveDate,
  makeProjectedAllocations: makeSelectProjectedAllocations,
  makeNotStartedAllocations: makeSelectNotStartedAllocations,
  makeTimelineSegments: makeSelectEmployeeTimelineSegments,
};

// Re-export types consumed by components
export type { WeekdayBounds, DateTick, TimelineSegment, SegmentColor };
