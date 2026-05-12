import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import {
  EmployeeAllocation,
  EmployeeCardData,
  EmployeePaceSummary,
  EmployeeShare,
  LookbackConfig,
  OVERLOAD_EPSILON,
  PaceCategory,
  ProgCodePace,
  ServCodePace,
  ServCodePaceDelta,
} from "@/app/bizPlan/pace/PaceType";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppState } from "@/store";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  NULL_PROGRAM_TYPE_KEY,
  LookbackStats,
  accumulateDailyProduction,
  computeLookbackStats,
  getValidProductionDates,
} from "@/app/bizPlan/pace/_lib/employeeLookbackUtils";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/rawPaceSelect";
import { dateStrings, dateRanges } from "@/lib/primatives/dates/dateStrings";
import { MatrixDisplayConfig } from "@/app/bizPlan/pace/paceSlice";

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

// Slice Selectors
const selectLookbackConfig = (state: AppState): LookbackConfig =>
  state.pace.lookbackConfig;

// Computes the lookback map: employeeId → programTypeKey → LookbackStats | null
type EmployeeLookbackMap = Map<string, Map<string, LookbackStats | null>>;

const selectEmployeeLookbackMap = createSelector(
  [deepSelect.servCodes, selectLookbackConfig],
  (servCodes, lookbackConfig): EmployeeLookbackMap => {
    // Collect all services within the lookback window
    const allServices = servCodes.flatMap((sc) => sc.services);
    // Include both completed services (by doneDate) and printed services (by schedDate).
    // Printed are committed to their schedDate and treated as effectively done for lookback.
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

    // Re-derive total daily CSP per employee directly from windowServices.
    // Includes both completed (by doneDate) and printed (by schedDate) services,
    // consistent with accumulateDailyProduction, so totalAvgDailyCSP reflects
    // the employee's true daily output including committed scheduled work.
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

    // Compute totalMaxDailyCSP and totalAvgDailyCSP per employee (across all programTypes)
    const totalMaxByEmployee = new Map<string, CountSizePrice>();
    const totalAvgByEmployee = new Map<string, CountSizePrice>();
    for (const [employeeId, byDate] of totalAccumulator) {
      const dailyTotals = Array.from(byDate.values());
      const totalMax = dailyTotals.reduce(
        (max, day) => ({
          count: Math.max(max.count, day.count),
          size: Math.max(max.size, day.size),
          price: Math.max(max.price, day.price),
          rev: Math.max(max.rev, day.rev),
        }),
        { ...baseCountSizePrice },
      );
      totalMaxByEmployee.set(employeeId, totalMax);

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

// Per-employee remaining capacity tracker (mutable, used within selectServCodePaces)
// Key: employeeId, Value: remaining CountSizePrice capacity
type CapacityTracker = Map<string, CountSizePrice>;

const selectServCodePaces = createSelector(
  [
    rawPaceSelect.rawServCodePaces,
    rawPaceSelect.rawServCodePaceMap,
    selectEmployeeLookbackMap,
    employeeSelect.employeeMap,
  ],
  (rawPaces, rawPaceMap, lookbackMap, employeeMap) => {
    // Pre-compute per-servCode team avg totals for weighted demand splitting.
    // For each servCode, sum the avgDailyCSP of all assigned employees (for this programType).
    // Employees with no lookback data contribute an even-split weight (1 unit per dimension).
    const teamAvgByServCode = new Map<string, CountSizePrice>();
    for (const raw of rawPaces) {
      const { servCode } = raw;
      const programTypeKey =
        servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
      let teamTotal = { ...baseCountSizePrice };
      let estimatedCount = 0;
      for (const employee of servCode.assignedTo) {
        const stats =
          lookbackMap.get(employee.employeeId)?.get(programTypeKey) ?? null;
        if (stats) {
          teamTotal = CountSizePriceOps.sum(teamTotal, stats.avgDailyCSP);
        } else {
          estimatedCount++;
        }
      }
      // Estimated employees each contribute 1 unit per dimension as a neutral weight
      teamTotal = {
        count: teamTotal.count + estimatedCount,
        size: teamTotal.size + estimatedCount,
        price: teamTotal.price + estimatedCount,
        rev: teamTotal.rev + estimatedCount,
      };
      teamAvgByServCode.set(servCode.servCodeId, teamTotal);
    }

    // Run the cascade per employee in their priority order (employee.servCodeIds[])
    // This ensures capacity is allocated to higher-priority servCodes first.
    const remainingCapacity: CapacityTracker = new Map();
    // employeeId → servCodeId → EmployeeShare (built during cascade)
    const sharesByEmployeeAndServCode = new Map<
      string,
      Map<string, EmployeeShare>
    >();

    for (const employee of employeeMap.values()) {
      const employeeLookback = lookbackMap.get(employee.employeeId);

      for (const servCodeId of employee.servCodeIds) {
        const raw = rawPaceMap.get(servCodeId);
        if (!raw) continue;

        const { servCode, unfinishedRate } = raw;

        // Look up stats using this servCode's specific program type
        const programTypeKey =
          servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
        const employeeStats = employeeLookback?.get(programTypeKey) ?? null;

        if (!employeeStats) {
          // No lookback data for this program type — even-split fallback
          const teamAvg = teamAvgByServCode.get(servCodeId) ?? {
            ...baseCountSizePrice,
          };
          // Weight = 1 (neutral) / teamAvg (which includes 1 per estimated employee)
          const perEmployeeRate =
            safeDivideCSP(unfinishedRate, teamAvg) != null
              ? {
                  count:
                    teamAvg.count > 0
                      ? unfinishedRate.count / teamAvg.count
                      : 0,
                  size:
                    teamAvg.size > 0 ? unfinishedRate.size / teamAvg.size : 0,
                  price:
                    teamAvg.price > 0
                      ? unfinishedRate.price / teamAvg.price
                      : 0,
                  rev: teamAvg.rev > 0 ? unfinishedRate.rev / teamAvg.rev : 0,
                }
              : CountSizePriceOps.divideBy(
                  unfinishedRate,
                  servCode.assignedTo.length || 1,
                );
          const share: EmployeeShare = {
            employee,
            expectedCSP: perEmployeeRate,
            maxDailyCSP: null,
            avgDailyCSP: null,
            fractionConsumed: null,
            isEstimated: true,
          };
          if (!sharesByEmployeeAndServCode.has(employee.employeeId)) {
            sharesByEmployeeAndServCode.set(employee.employeeId, new Map());
          }
          sharesByEmployeeAndServCode
            .get(employee.employeeId)!
            .set(servCodeId, share);
          continue;
        }

        const { maxDailyCSP, avgDailyCSP, totalAvgDailyCSP } = employeeStats;

        if (!remainingCapacity.has(employee.employeeId)) {
          remainingCapacity.set(employee.employeeId, { ...totalAvgDailyCSP });
        }
        const remaining = remainingCapacity.get(employee.employeeId)!;

        // Weighted demand split: employee's share proportional to their avgDailyCSP
        // relative to the total team avg for this servCode's programType.
        // e.g. Brock avg 16, Adam avg 12, team avg 28 → Brock gets 57%, Adam gets 43%
        const teamAvg = teamAvgByServCode.get(servCodeId) ?? {
          ...baseCountSizePrice,
        };
        const perEmployeeRate: CountSizePrice = {
          count:
            teamAvg.count > 0
              ? unfinishedRate.count * (avgDailyCSP.count / teamAvg.count)
              : 0,
          size:
            teamAvg.size > 0
              ? unfinishedRate.size * (avgDailyCSP.size / teamAvg.size)
              : 0,
          price:
            teamAvg.price > 0
              ? unfinishedRate.price * (avgDailyCSP.price / teamAvg.price)
              : 0,
          rev:
            teamAvg.rev > 0
              ? unfinishedRate.rev * (avgDailyCSP.rev / teamAvg.rev)
              : 0,
        };

        // Allocate: min(remaining, this employee's weighted share of the servCode demand)
        const expectedCSP = minCSP(remaining, perEmployeeRate);

        // Deduct from remaining capacity
        remainingCapacity.set(
          employee.employeeId,
          CountSizePriceOps.subtract(remaining, expectedCSP),
        );

        // fractionConsumed denominator is totalAvgDailyCSP — "fraction of a typical day"
        const fractionConsumed = safeDivideCSP(expectedCSP, totalAvgDailyCSP);

        const share: EmployeeShare = {
          employee,
          expectedCSP,
          maxDailyCSP,
          avgDailyCSP,
          fractionConsumed,
          isEstimated: false,
        };

        if (!sharesByEmployeeAndServCode.has(employee.employeeId)) {
          sharesByEmployeeAndServCode.set(employee.employeeId, new Map());
        }
        sharesByEmployeeAndServCode
          .get(employee.employeeId)!
          .set(servCodeId, share);
      }
    }

    // Now build ServCodePace[] using the pre-computed raw paces and shares
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

      const employeeShares: EmployeeShare[] = servCode.assignedTo.map(
        (employee) => {
          const share = sharesByEmployeeAndServCode
            .get(employee.employeeId)
            ?.get(servCode.servCodeId);

          if (share) return share;

          // Fallback: employee assigned but not in their priority list yet (shouldn't happen)
          return {
            employee,
            expectedCSP: { ...baseCountSizePrice },
            maxDailyCSP: null,
            avgDailyCSP: null,
            fractionConsumed: null,
            isEstimated: true,
          };
        },
      );

      const teamExpectedCSP = CountSizePriceOps.sumAll(
        employeeShares.map((s) => s.expectedCSP ?? { ...baseCountSizePrice }),
      );

      // teamAvgCapacity = sum of each employee's per-programType avgDailyCSP.
      // This is the realistic daily output of the team for this servCode's program type,
      // used for the slash display (teamAvgCapacity / unfinishedRate).
      const teamAvgCapacity = CountSizePriceOps.sumAll(
        employeeShares.map((s) => s.avgDailyCSP ?? { ...baseCountSizePrice }),
      );

      const paceDelta = CountSizePriceOps.subtract(
        teamExpectedCSP,
        unfinishedRate,
      );
      const paceDeltaPct = safeDivideCSP(paceDelta, unfinishedRate);

      const pace: ServCodePace = {
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
      };
      return pace;
    });
  },
);

const selectServCodePaceMap = createSelector([selectServCodePaces], (paces) =>
  new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

const selectProgCodePaces = createSelector(
  [progServSelect.progCodes, selectServCodePaceMap],
  (progCodes, paceMap) => {
    const progCodePaces: ProgCodePace[] = progCodes.map((progCode) => {
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
      return {
        progCode,
        servCodePaces,
        category,
        unfinishedCSP,
        finishedCSP,
      };
    });
    return progCodePaces;
  },
);

// Cross-servCode capacity summary per employee, grouped by (employee, programType).
// One entry per (employee, programType) — use employeeCardData for the merged per-employee view.
const selectEmployeePaceByProgramType = createSelector(
  [
    selectServCodePaces,
    selectEmployeeLookbackMap,
    assignmentPlanSelect.assignmentsByEmployeeId,
  ],
  (
    servCodePaces,
    lookbackMap,
    assignmentsByEmployeeId,
  ): EmployeePaceSummary[] => {
    // Group all EmployeeShare entries by employeeId
    const byEmployee = new Map<
      string,
      { shares: EmployeeShare[]; servCodePaces: ServCodePace[] }
    >();

    for (const pace of servCodePaces) {
      for (const share of pace.employeeShares) {
        const employeeId = share.employee.employeeId;
        if (!byEmployee.has(employeeId)) {
          byEmployee.set(employeeId, { shares: [], servCodePaces: [] });
        }
        const entry = byEmployee.get(employeeId)!;
        entry.shares.push(share);
        entry.servCodePaces.push(pace);
      }
    }

    const summaries: EmployeePaceSummary[] = [];

    for (const [
      employeeId,
      { shares, servCodePaces: employeePaces },
    ] of byEmployee) {
      const employee = shares[0].employee;
      const employeeLookback = lookbackMap.get(employeeId);
      const priorityOrder =
        assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      // Group shares by programType — one summary per (employee, programType)
      const byProgramType = new Map<
        string,
        { shares: EmployeeShare[]; paces: ServCodePace[] }
      >();
      for (let i = 0; i < shares.length; i++) {
        const key =
          employeePaces[i].servCode.progCode.programType ??
          NULL_PROGRAM_TYPE_KEY;
        if (!byProgramType.has(key))
          byProgramType.set(key, { shares: [], paces: [] });
        const group = byProgramType.get(key)!;
        group.shares.push(shares[i]);
        group.paces.push(employeePaces[i]);
      }

      for (const [programTypeKey, group] of byProgramType) {
        const programType =
          programTypeKey === NULL_PROGRAM_TYPE_KEY ? null : programTypeKey;
        const stats = employeeLookback?.get(programTypeKey) ?? null;

        const unsortedAllocations: EmployeeAllocation[] = group.shares.map(
          (share, i) => ({
            servCode: group.paces[i].servCode,
            fractionConsumed: share.fractionConsumed,
            expectedCSP: share.expectedCSP ?? { ...baseCountSizePrice },
            avgDailyCSP: share.avgDailyCSP,
          }),
        );

        // Sort allocations by the manager's priority order
        const allocations = [...unsortedAllocations].sort((a, b) => {
          const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
          const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
          return ia - ib;
        });

        const fractionConsumedValues = allocations
          .map((a) => a.fractionConsumed)
          .filter((f): f is CountSizePrice => f !== null);

        const totalFractionConsumed =
          fractionConsumedValues.length > 0
            ? CountSizePriceOps.sumAll(fractionConsumedValues)
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

        summaries.push({
          employee,
          programType,
          maxDailyCSP: stats?.maxDailyCSP ?? null,
          avgDailyCSP: stats?.avgDailyCSP ?? null,
          totalMaxDailyCSP: null,
          totalAvgDailyCSP: stats?.totalAvgDailyCSP ?? null,
          allocations,
          totalFractionConsumed,
          freeCapacityFraction,
          isOverloaded,
        });
      }
    }

    return summaries;
  },
);

// Merges employeePaceByProgramType across all programTypes into one entry per employee.
// Allocations are sorted by the manager's global priority order (employee.servCodeIds[]).
// Only includes employees with at least one allocation.
const selectEmployeeCardData = createSelector(
  [
    selectEmployeePaceByProgramType,
    assignmentPlanSelect.assignmentsByEmployeeId,
  ],
  (summaries, assignmentsByEmployeeId): EmployeeCardData[] => {
    const byEmployee = new Map<string, EmployeePaceSummary[]>();
    for (const summary of summaries) {
      const employeeId = summary.employee.employeeId;
      const existing = byEmployee.get(employeeId) ?? [];
      existing.push(summary);
      byEmployee.set(employeeId, existing);
    }

    const result: EmployeeCardData[] = [];

    for (const [employeeId, employeeSummaries] of byEmployee) {
      const employee = employeeSummaries[0].employee;
      const priorityOrder =
        assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      // Flatten all allocations across programTypes, then sort by global priority.
      // avgDailyCSP is per-programType so it's already on each allocation from the summary.
      const allAllocations = employeeSummaries.flatMap((s) => s.allocations);
      const allocations = [...allAllocations].sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });

      if (allocations.length === 0) continue;

      // Sum totalFractionConsumed across all programType summaries
      const fractionValues = employeeSummaries
        .map((s) => s.totalFractionConsumed)
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
        allocations,
        totalFractionConsumed,
        freeCapacityFraction,
        isOverloaded,
      });
    }

    // Alphabetical by employee name
    return result.sort((a, b) =>
      a.employee.name.localeCompare(b.employee.name),
    );
  },
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

// ---------------------------------------------------------------------------
// Matrix selectors
// ---------------------------------------------------------------------------

const selectMatrixDisplayConfig = (state: AppState): MatrixDisplayConfig =>
  state.pace.matrixDisplayConfig;

// ---------------------------------------------------------------------------
// Cascade-aware delta projection helpers
// ---------------------------------------------------------------------------

/**
 * Per-servCode data needed for the cascade-aware projection.
 * Keyed by servCodeId.
 */
type ServCodeProjectionData = {
  servCodeId: string;
  /** Effective open date for projection (projectionStartDate or max(today, dateRange.min)) */
  openDate: string;
  /** dateRange.max — the deadline */
  closeDate: string;
  /** Remaining work pool per dimension (activeAsapCSP, excludes printed) */
  pool: { count: number; size: number; price: number };
  /** Per-employee daily rate per dimension. Estimated for employees without lookback data. */
  dailyRateByEmployee: Map<string, { count: number; size: number; price: number }>;
};

/**
 * Simulates each employee's priority-ordered schedule and computes how much work
 * they contribute to each servCode over the season.
 *
 * An employee works the highest-priority open servCode at any point in time.
 * "Open" means: dateRange.min ≤ date ≤ dateRange.max AND remaining work > 0.
 * The timeline is split at every servCode boundary date so we can compute
 * each interval analytically (no day-by-day loop).
 *
 * Returns: Map<employeeId, Map<servCodeId, { count, size, price }>>
 * — total units this employee contributes to each servCode.
 */
function buildEmployeeContributions(
  priorityOrderedServCodeIds: string[],
  projectionDataMap: Map<string, ServCodeProjectionData>,
  today: string,
): Map<string, { count: number; size: number; price: number }> {
  // Track remaining work per servCode for this employee's simulation
  const remaining = new Map<string, { count: number; size: number; price: number }>();
  for (const servCodeId of priorityOrderedServCodeIds) {
    const data = projectionDataMap.get(servCodeId);
    if (!data) continue;
    remaining.set(servCodeId, { ...data.pool });
  }

  // Collect all boundary dates: today + every openDate + every closeDate
  const boundarySet = new Set<string>([today]);
  for (const servCodeId of priorityOrderedServCodeIds) {
    const data = projectionDataMap.get(servCodeId);
    if (!data) continue;
    boundarySet.add(data.openDate);
    boundarySet.add(data.closeDate);
  }
  const boundaries = [...boundarySet].sort();

  const contributions = new Map<string, { count: number; size: number; price: number }>();
  for (const servCodeId of priorityOrderedServCodeIds) {
    contributions.set(servCodeId, { count: 0, size: 0, price: 0 });
  }

  // Walk each interval between boundary dates
  for (let i = 0; i < boundaries.length - 1; i++) {
    const intervalStart = boundaries[i];
    const intervalEnd = boundaries[i + 1];

    // Weekdays in this interval (exclusive of end — it's the next interval's start)
    // countWeekdays is inclusive of both endpoints, so subtract 1 for the shared endpoint
    const intervalWeekdays = Math.max(
      0,
      dateRanges.countWeekdays({ min: intervalStart, max: intervalEnd }) - 1,
    );
    if (intervalWeekdays <= 0) continue;

    // Find the highest-priority servCode that is open during this interval
    // and still has remaining work for this employee
    for (const servCodeId of priorityOrderedServCodeIds) {
      const data = projectionDataMap.get(servCodeId);
      if (!data) continue;

      // ServCode must be open: openDate ≤ intervalStart AND closeDate ≥ intervalEnd
      if (data.openDate > intervalStart || data.closeDate < intervalEnd) continue;

      const rem = remaining.get(servCodeId)!;
      const rate = data.dailyRateByEmployee.get("__self__");
      if (!rate) continue;

      // Check if there's any remaining work in any dimension
      if (rem.count <= 0 && rem.size <= 0 && rem.price <= 0) continue;

      // Contribute min(rate * days, remaining) per dimension
      const contrib = contributions.get(servCodeId)!;
      const countContrib = Math.min(rate.count * intervalWeekdays, rem.count);
      const sizeContrib = Math.min(rate.size * intervalWeekdays, rem.size);
      const priceContrib = Math.min(rate.price * intervalWeekdays, rem.price);

      contrib.count += countContrib;
      contrib.size += sizeContrib;
      contrib.price += priceContrib;

      rem.count = Math.max(0, rem.count - countContrib);
      rem.size = Math.max(0, rem.size - sizeContrib);
      rem.price = Math.max(0, rem.price - priceContrib);

      // This employee works only one servCode per interval (highest priority)
      break;
    }
  }

  return contributions;
}

/**
 * Given a shared work pool and a timeline of per-employee daily rates
 * (each employee available from a certain date), computes the projected
 * completion date using interval-based pool drain.
 *
 * employeeAvailability: Map<employeeId, { availableFrom, rate }>
 * pool: total remaining work
 * projectionStart: earliest date any employee can start
 * closeDate: deadline (dateRange.max)
 *
 * Returns the projected completion date, or null if no employees have data.
 */
function computePoolDrainDate(
  employeeAvailability: { availableFrom: string; rate: number }[],
  pool: number,
  projectionStart: string,
  closeDate: string,
): string | null {
  if (pool <= 0) return projectionStart;
  if (employeeAvailability.length === 0) return null;

  // Collect all boundary dates for the drain simulation
  const boundarySet = new Set<string>([projectionStart, closeDate]);
  for (const { availableFrom } of employeeAvailability) {
    if (availableFrom >= projectionStart) boundarySet.add(availableFrom);
  }
  const boundaries = [...boundarySet].sort();

  let remaining = pool;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const intervalStart = boundaries[i];
    const intervalEnd = boundaries[i + 1];

    // Sum rates of employees available during this interval
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
      // Pool drains within this interval
      const daysNeeded = remaining / intervalRate;
      return dateStrings.addWeekdays(intervalStart, daysNeeded);
    }

    remaining -= produced;
  }

  // Pool not exhausted by closeDate — project beyond deadline
  // Use the rate at the last interval (all employees available)
  let finalRate = 0;
  for (const { availableFrom, rate } of employeeAvailability) {
    if (availableFrom <= closeDate) finalRate += rate;
  }
  if (finalRate <= 0) return null;

  const daysNeeded = remaining / finalRate;
  return dateStrings.addWeekdays(closeDate, daysNeeded);
}

// ---------------------------------------------------------------------------
// selectEmployeeAvailableFromMap
//
// Shared selector: for each employee, computes the date they first become
// available to work each servCode, accounting for higher-priority servCodes
// consuming their time first (changeover/FIFO model).
//
// An employee works the highest-priority open servCode at any point in time.
// "Open" means: openDate ≤ date ≤ closeDate AND remaining work > 0.
// The timeline is split at every servCode boundary date for analytic computation.
//
// Returns: Map<employeeId, Map<servCodeId, availableFromDate>>
// ---------------------------------------------------------------------------

/** Builds the projection data map (Phase 1) for a given set of servCode paces. */
function buildProjectionDataMap(
  servCodePaces: ServCodePace[],
  lookbackMap: EmployeeLookbackMap,
  perDayMap: Map<string, { activeAsapCSP: CountSizePrice; projectionStartDate: string | null; unfinishedCSP?: CountSizePrice }>,
  today: string,
): Map<string, ServCodeProjectionData> {
  const projectionDataMap = new Map<string, ServCodeProjectionData>();

  for (const pace of servCodePaces) {
    const { servCode, unfinishedCSP } = pace;
    const servCodeId = servCode.servCodeId;
    const dateRange = servCode.dateRange;
    const programTypeKey = servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;

    if (!dateRanges.isValidDateRange(dateRange)) continue;

    const perDayData = perDayMap.get(servCodeId);
    const activeAsapCSP = perDayData?.activeAsapCSP ?? unfinishedCSP;
    const openDate =
      perDayData?.projectionStartDate ??
      (today > dateRange.min ? today : dateRange.min);

    if (!openDate) continue;

    const knownRates: { count: number; size: number; price: number }[] = [];
    for (const employee of servCode.assignedTo) {
      const stats = lookbackMap.get(employee.employeeId)?.get(programTypeKey) ?? null;
      if (stats) {
        knownRates.push({
          count: stats.avgDailyCSP.count,
          size: stats.avgDailyCSP.size,
          price: stats.avgDailyCSP.price,
        });
      }
    }

    const avgKnownRate =
      knownRates.length > 0
        ? {
            count: knownRates.reduce((s, r) => s + r.count, 0) / knownRates.length,
            size: knownRates.reduce((s, r) => s + r.size, 0) / knownRates.length,
            price: knownRates.reduce((s, r) => s + r.price, 0) / knownRates.length,
          }
        : null;

    const dailyRateByEmployee = new Map<string, { count: number; size: number; price: number }>();
    for (const employee of servCode.assignedTo) {
      const stats = lookbackMap.get(employee.employeeId)?.get(programTypeKey) ?? null;
      if (stats) {
        dailyRateByEmployee.set(employee.employeeId, {
          count: stats.avgDailyCSP.count,
          size: stats.avgDailyCSP.size,
          price: stats.avgDailyCSP.price,
        });
      } else if (avgKnownRate) {
        dailyRateByEmployee.set(employee.employeeId, { ...avgKnownRate });
      } else {
        dailyRateByEmployee.set(employee.employeeId, { count: 1, size: 1, price: 1 });
      }
    }

    projectionDataMap.set(servCodeId, {
      servCodeId,
      openDate,
      closeDate: dateRange.max,
      pool: {
        count: activeAsapCSP.count,
        size: activeAsapCSP.size,
        price: activeAsapCSP.price,
      },
      dailyRateByEmployee,
    });
  }

  return projectionDataMap;
}

/** Runs Phase 2: per-employee cascade simulation to determine availableFrom dates. */
function buildAvailableFromMap(
  projectionDataMap: Map<string, ServCodeProjectionData>,
  assignmentsByEmployeeId: Map<string, { servCodeIds: string[] }>,
  today: string,
): Map<string, Map<string, string>> {
  const employeeAvailableFrom = new Map<string, Map<string, string>>();

  for (const [employeeId, assignment] of assignmentsByEmployeeId) {
    const priorityOrder = assignment.servCodeIds;
    if (priorityOrder.length === 0) continue;

    const selfProjectionMap = new Map<string, ServCodeProjectionData>();
    for (const servCodeId of priorityOrder) {
      const data = projectionDataMap.get(servCodeId);
      if (!data) continue;
      const rate = data.dailyRateByEmployee.get(employeeId);
      if (!rate) continue;
      selfProjectionMap.set(servCodeId, {
        ...data,
        dailyRateByEmployee: new Map([["__self__", rate]]),
      });
    }

    const remaining = new Map<string, { count: number; size: number; price: number }>();
    for (const servCodeId of priorityOrder) {
      const data = selfProjectionMap.get(servCodeId);
      if (data) remaining.set(servCodeId, { ...data.pool });
    }

    const boundarySet = new Set<string>([today]);
    for (const servCodeId of priorityOrder) {
      const data = selfProjectionMap.get(servCodeId);
      if (!data) continue;
      boundarySet.add(data.openDate);
      boundarySet.add(data.closeDate);
    }
    const boundaries = [...boundarySet].sort();

    const availableFrom = new Map<string, string>();
    employeeAvailableFrom.set(employeeId, availableFrom);


    for (let i = 0; i < boundaries.length - 1; i++) {
      const intervalStart = boundaries[i];
      const intervalEnd = boundaries[i + 1];

      const intervalWeekdays = Math.max(
        0,
        dateRanges.countWeekdays({ min: intervalStart, max: intervalEnd }) - 1,
      );
      if (intervalWeekdays <= 0) continue;

      for (const servCodeId of priorityOrder) {
        const data = selfProjectionMap.get(servCodeId);
        if (!data) continue;
        if (data.openDate > intervalStart || data.closeDate < intervalEnd) continue;

        const rem = remaining.get(servCodeId)!;
        const rate = data.dailyRateByEmployee.get("__self__");
        if (!rate) continue;
        if (rem.count <= 0 && rem.size <= 0 && rem.price <= 0) continue;

        if (!availableFrom.has(servCodeId)) {
          availableFrom.set(servCodeId, intervalStart);
        }

        rem.count = Math.max(0, rem.count - rate.count * intervalWeekdays);
        rem.size = Math.max(0, rem.size - rate.size * intervalWeekdays);
        rem.price = Math.max(0, rem.price - rate.price * intervalWeekdays);

        break;
      }
    }

  }

  return employeeAvailableFrom;
}

// Exported type for consumers (employeePaceSelect)
export type EmployeeAvailableFromMap = Map<string, Map<string, string>>;

const selectEmployeeAvailableFromMap = createSelector(
  [
    selectServCodePaces,
    selectEmployeeLookbackMap,
    rawPaceSelect.rawServCodePacesPerDayMap,
    assignmentPlanSelect.assignmentsByEmployeeId,
  ],
  (servCodePaces, lookbackMap, perDayMap, assignmentsByEmployeeId): EmployeeAvailableFromMap => {
    const today = dateStrings.today();
    const projectionDataMap = buildProjectionDataMap(servCodePaces, lookbackMap, perDayMap, today);
    return buildAvailableFromMap(projectionDataMap, assignmentsByEmployeeId, today);
  },
);

// ---------------------------------------------------------------------------
// selectServCodePaceDeltaMap
//
// Cascade-aware delta projection. Each employee works their highest-priority
// open servCode at any point in time. Overlapping servCodes are handled by
// priority: a higher-priority servCode greedily absorbs the employee's capacity
// until it is complete, then the next servCode in priority order gets their
// attention. If a lower-priority servCode opens before a higher-priority one,
// the employee works the lower-priority one until the higher-priority one opens.
//
// The shared pool model: all assigned employees pull from the same work pool.
// The pool drains at the combined rate of all currently-available employees.
// The projected end date is when the pool hits zero.
//
// Uses activeAsapCSP (excludes printed/committed work) and projectionStartDate
// (day after latest printed schedDate) for a stable intraday projection.
//
// programType is sourced from the CRM and must be correctly set per progCode.
// If programType is shared across unrelated progCodes, the lookback rate will be
// inflated by unrelated work history, producing incorrect delta projections.
//
// CRM gotcha: "Special Jobs" have two programType fields — one at the top of the
// Service setup page and one at the bottom. The bottom field is the one that
// controls the programType used here. Both must be set correctly.
// ---------------------------------------------------------------------------
const selectServCodePaceDeltaMap = createSelector(
  [
    selectServCodePaces,
    selectEmployeeLookbackMap,
    rawPaceSelect.rawServCodePacesPerDayMap,
    assignmentPlanSelect.assignmentsByEmployeeId,
    selectEmployeeAvailableFromMap,
  ],
  (servCodePaces, lookbackMap, perDayMap, _assignmentsByEmployeeId, employeeAvailableFromMap): Map<string, ServCodePaceDelta> => {
    const today = dateStrings.today();
    const result = new Map<string, ServCodePaceDelta>();

    // Phase 1: Build projection data
    const projectionDataMap = buildProjectionDataMap(servCodePaces, lookbackMap, perDayMap, today);

    // Phase 2: use shared selector
    const employeeAvailableFrom = employeeAvailableFromMap;

    // ---------------------------------------------------------------------------
    // Phase 3: Shared pool drain per servCode
    // All assigned employees pull from the same pool. The pool drains at the
    // combined rate of employees who are currently available.
    // ---------------------------------------------------------------------------

    for (const pace of servCodePaces) {
      const { servCode } = pace;
      const servCodeId = servCode.servCodeId;
      const dateRange = servCode.dateRange;
      const data = projectionDataMap.get(servCodeId);

      if (!data || !dateRanges.isValidDateRange(dateRange)) {
        result.set(servCodeId, {
          servCodeId,
          dateRange,
          projectedEndDate: null,
          deltaDays: null,
          deltaDaysCSP: null,
        });
        continue;
      }

      // Build availability list for each dimension
      const availabilityCount: { availableFrom: string; rate: number }[] = [];
      const availabilitySize: { availableFrom: string; rate: number }[] = [];
      const availabilityPrice: { availableFrom: string; rate: number }[] = [];

      for (const employee of servCode.assignedTo) {
        const employeeId = employee.employeeId;
        const rate = data.dailyRateByEmployee.get(employeeId);
        if (!rate) continue;

        // When does this employee become available to this servCode?
        const availFrom =
          employeeAvailableFrom.get(employeeId)?.get(servCodeId) ?? data.openDate;

        if (rate.count > 0) availabilityCount.push({ availableFrom: availFrom, rate: rate.count });
        if (rate.size > 0) availabilitySize.push({ availableFrom: availFrom, rate: rate.size });
        if (rate.price > 0) availabilityPrice.push({ availableFrom: availFrom, rate: rate.price });
      }

      // Compute projected end date per dimension
      const projectedEndCount = computePoolDrainDate(
        availabilityCount,
        data.pool.count,
        data.openDate,
        data.closeDate,
      );
      const projectedEndSize = computePoolDrainDate(
        availabilitySize,
        data.pool.size,
        data.openDate,
        data.closeDate,
      );
      const projectedEndPrice = computePoolDrainDate(
        availabilityPrice,
        data.pool.price,
        data.openDate,
        data.closeDate,
      );

      // Primary delta uses count dimension (same as before)
      const projectedEndDate = projectedEndCount;
      const deltaDays =
        projectedEndDate != null && data.pool.count > 0
          ? dateRanges.weekdaysBetween(dateRange.max, projectedEndDate)
          : null;

      const deltaDaysCSP = {
        count:
          projectedEndCount != null && data.pool.count > 0
            ? dateRanges.weekdaysBetween(dateRange.max, projectedEndCount)
            : null,
        size:
          projectedEndSize != null && data.pool.size > 0
            ? dateRanges.weekdaysBetween(dateRange.max, projectedEndSize)
            : null,
        price:
          projectedEndPrice != null && data.pool.price > 0
            ? dateRanges.weekdaysBetween(dateRange.max, projectedEndPrice)
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

// Min/max deltaDays across all servCodes — used to set slider bounds in the UI.
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

// Filtered and sorted progCodePaces for the AssignmentMatrix.
// Applies filterAssigned, filterCategories, filterDeltaDays, then sorts by sortKey + cspDisplay.
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

    // Helper: get the unfinished CSP for a servCode based on display mode
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
      // "total"
      return (
        perDayMap.get(servCodeId)?.unfinishedCSP ?? { ...baseCountSizePrice }
      );
    }

    const filtered = progCodePaces.filter((p) => {
      // Filter by assigned status
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

      // Filter by category (empty = show all)
      if (filterCategories.length > 0) {
        const hasMatchingCategory = p.servCodePaces.some((sp) =>
          filterCategories.includes(sp.category),
        );
        if (!hasMatchingCategory) return false;
      }

      // Filter by deltaDays range (null = disabled)
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
        if (countA !== countB) return countB - countA; // descending
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      // CSP sort: sum the chosen dimension across all servCodes in the progCode
      const dim = sortKey as "count" | "size" | "price" | "rev";
      const sumA = a.servCodePaces.reduce(
        (s, sp) => s + getServCodeCsp(sp.servCode.servCodeId)[dim],
        0,
      );
      const sumB = b.servCodePaces.reduce(
        (s, sp) => s + getServCodeCsp(sp.servCode.servCodeId)[dim],
        0,
      );
      if (sumA !== sumB) return sumB - sumA; // descending
      return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
    });
  },
);

export const paceSelect = {
  servCodePaces: selectServCodePaces,
  urgentServCodePaces: selectUrgentServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  progCodePaces: selectProgCodePaces,
  lookbackConfig: selectLookbackConfig,
  employeeLookbackMap: selectEmployeeLookbackMap,
  employeePaceByProgramType: selectEmployeePaceByProgramType,
  employeeCardData: selectEmployeeCardData,
  matrixDisplayConfig: selectMatrixDisplayConfig,
  servCodePaceDeltaMap: selectServCodePaceDeltaMap,
  matrixDeltaDaysBounds: selectMatrixDeltaDaysBounds,
  matrixFilteredSortedProgCodePaces: selectMatrixFilteredSortedProgCodePaces,
  employeeAvailableFromMap: selectEmployeeAvailableFromMap,
};
