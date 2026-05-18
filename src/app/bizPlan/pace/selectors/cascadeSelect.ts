import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/selectors/rawPaceSelect";
import {
  CSP,
  CSPOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  NULL_PROGRAM_TYPE_KEY,
  LookbackStats,
  accumulateDailyProduction,
  computeLookbackStats,
  getValidProductionDates,
  getServiceEffectiveDate,
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
// Layer 2 — Employee Lookback
// ---------------------------------------------------------------------------

type EmployeeLookbackMap = Map<string, Map<string, LookbackStats | null>>;

// Filters the full service list to only those within the lookback window.
function filterServicesToLookbackWindow(
  allServices: ReturnType<typeof deepSelect.servCodes>[number]["services"],
  lookbackStart: string,
) {
  return allServices.filter((s) => {
    if (s.status === "S" && s.production?.doneDate != null) {
      return s.production.doneDate >= lookbackStart;
    }
    if (s.status === "$" && s.lastAssigned.schedDate != null) {
      return s.lastAssigned.schedDate >= lookbackStart;
    }
    return false;
  });
}

// Builds a map of employeeId → average daily CSP across all programTypes in the window.
function buildTotalAvgByEmployee(
  windowServices: ReturnType<typeof filterServicesToLookbackWindow>,
  validDates: Set<string>,
): Map<string, CSP> {
  const totalAccumulator = new Map<string, Map<string, CSP>>();

  for (const service of windowServices) {
    const effectiveDate = getServiceEffectiveDate(service);
    if (!effectiveDate || !validDates.has(effectiveDate)) continue;

    const serviceCSP = CSPOps.fromService(service);

    if (service.status === "S" && service.production?.doneBys) {
      for (const doneBy of service.production.doneBys) {
        const employeeId = doneBy.employeeId;
        const contribution = CSPOps.multiply(serviceCSP, doneBy.percent);
        if (!totalAccumulator.has(employeeId)) totalAccumulator.set(employeeId, new Map());
        const byDate = totalAccumulator.get(employeeId)!;
        const existing = byDate.get(effectiveDate) ?? { ...baseCountSizePrice };
        byDate.set(effectiveDate, CSPOps.sum(existing, contribution));
      }
    } else if (service.status === "$" && service.lastAssigned.employeeId) {
      const employeeId = service.lastAssigned.employeeId;
      if (!totalAccumulator.has(employeeId)) totalAccumulator.set(employeeId, new Map());
      const byDate = totalAccumulator.get(employeeId)!;
      const existing = byDate.get(effectiveDate) ?? { ...baseCountSizePrice };
      byDate.set(effectiveDate, CSPOps.sum(existing, serviceCSP));
    }
  }

  const totalAvgByEmployee = new Map<string, CSP>();
  for (const [employeeId, byDate] of totalAccumulator) {
    const dailyTotals = Array.from(byDate.values());
    const totalSum = CSPOps.sumAll(dailyTotals);
    totalAvgByEmployee.set(employeeId, CSPOps.divideBy(totalSum, dailyTotals.length));
  }
  return totalAvgByEmployee;
}

const selectEmployeeLookbackMap = createSelector(
  [deepSelect.servCodes, selectLookbackConfig],
  (servCodes, lookbackConfig): EmployeeLookbackMap => {
    const allServices = servCodes.flatMap((sc) => sc.services);
    const windowServices = filterServicesToLookbackWindow(allServices, lookbackConfig.lookbackStart);

    const validDates = getValidProductionDates(windowServices, lookbackConfig.completionThreshold);
    const rawAccumulation = accumulateDailyProduction(windowServices, validDates);
    const totalAvgByEmployee = buildTotalAvgByEmployee(windowServices, validDates);

    const result: EmployeeLookbackMap = new Map();
    for (const [employeeId, byProgramType] of rawAccumulation) {
      const totalAvgDailyCSP = totalAvgByEmployee.get(employeeId) ?? { ...baseCountSizePrice };
      const statsMap = new Map<string, LookbackStats | null>();
      for (const [programTypeKey, dailyProductions] of byProgramType) {
        statsMap.set(programTypeKey, computeLookbackStats(dailyProductions, totalAvgDailyCSP));
      }
      result.set(employeeId, statsMap);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 3 — Employee Cascade (sequential-completion, per-employee weighted share)
// ---------------------------------------------------------------------------

type TeamStats = {
  teamAvgCSP: CSP;
  teamMaxCSP: CSP;
  knownCount: number;
  totalAssigned: number;
  avgTotalAvgDailyCSP: CSP;
};

// Returns the latest printed schedDate across all employees for all servCodes.
// Used to push each employee's openDate past their already-booked routes.
function buildEmployeeLatestPrintedDateMap(
  perDayMap: Map<string, { servCode: ServCodeDeep }>,
): Map<string, string> {
  const employeeLatestPrintedDate = new Map<string, string>();
  for (const [, perDay] of perDayMap) {
    for (const service of perDay.servCode.services) {
      if (
        service.status === "$" &&
        service.lastAssigned.schedDate &&
        service.lastAssigned.employeeId
      ) {
        const existing = employeeLatestPrintedDate.get(service.lastAssigned.employeeId);
        if (!existing || service.lastAssigned.schedDate > existing) {
          employeeLatestPrintedDate.set(
            service.lastAssigned.employeeId,
            service.lastAssigned.schedDate,
          );
        }
      }
    }
  }
  return employeeLatestPrintedDate;
}

// Computes per-servCode team stats: sum of avg/max daily CSP for all assigned employees
// with lookback data. Used to compute each employee's proportional share of the work pool.
function buildTeamStatsCache(
  perDayMap: Map<string, { servCode: ServCodeDeep; activeAsapCSP: CSP }>,
  lookbackMap: EmployeeLookbackMap,
): Map<string, TeamStats> {
  const teamStatsCache = new Map<string, TeamStats>();

  for (const [servCodeId, perDay] of perDayMap) {
    const programTypeKey = perDay.servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
    const assignedEmployees = perDay.servCode.assignedTo;

    let teamAvgCSP = { ...baseCountSizePrice };
    let teamMaxCSP = { ...baseCountSizePrice };
    let knownCount = 0;
    const knownTotalAvgs: CSP[] = [];

    for (const employee of assignedEmployees) {
      const stats = lookbackMap.get(employee.employeeId)?.get(programTypeKey) ?? null;
      if (stats) {
        teamAvgCSP = CSPOps.sum(teamAvgCSP, stats.avgDailyCSP);
        teamMaxCSP = CSPOps.sum(teamMaxCSP, stats.maxDailyCSP);
        knownTotalAvgs.push(stats.totalAvgDailyCSP);
        knownCount++;
      }
    }

    const avgTotalAvgDailyCSP =
      knownTotalAvgs.length > 0
        ? CSPOps.divideBy(CSPOps.sumAll(knownTotalAvgs), knownTotalAvgs.length)
        : { ...baseCountSizePrice };

    teamStatsCache.set(servCodeId, {
      teamAvgCSP,
      teamMaxCSP,
      knownCount,
      totalAssigned: assignedEmployees.length,
      avgTotalAvgDailyCSP,
    });
  }

  return teamStatsCache;
}

// Extracts the cross-programType totalAvgDailyCSP for an employee from any stats entry.
function getTotalAvgDailyCSP(
  employeeLookback: Map<string, LookbackStats | null> | undefined,
): CSP | null {
  if (!employeeLookback) return null;
  for (const stats of employeeLookback.values()) {
    if (stats?.totalAvgDailyCSP) return stats.totalAvgDailyCSP;
  }
  return null;
}

type ServCodeSimData = {
  servCodeId: string;
  openDate: string;
  closeDate: string;
  pool: CSP;
  dailyRate: CSP;
  maxDailyRate: CSP;
  isEstimated: boolean;
};

// Computes the weighted pool share for an employee who has lookback data.
function computeWeightedPool(
  activeAsapCSP: CSP,
  employeeAvgCSP: CSP,
  teamAvgCSP: CSP,
): CSP {
  return {
    count: teamAvgCSP.count > 0 ? activeAsapCSP.count * (employeeAvgCSP.count / teamAvgCSP.count) : 0,
    size: teamAvgCSP.size > 0 ? activeAsapCSP.size * (employeeAvgCSP.size / teamAvgCSP.size) : 0,
    price: teamAvgCSP.price > 0 ? activeAsapCSP.price * (employeeAvgCSP.price / teamAvgCSP.price) : 0,
    rev: teamAvgCSP.rev > 0 ? activeAsapCSP.rev * (employeeAvgCSP.rev / teamAvgCSP.rev) : 0,
  };
}

// Determines the open/close dates for an employee's work on a servCode.
// Accounts for alwaysAsap, overdue servCodes, and per-employee printed route offsets.
function computeServCodeDates(
  servCode: ServCodeDeep,
  perDay: { projectionStartDate: string | null; activeAsapCSP: CSP },
  teamStats: TeamStats,
  employeeLatestPrinted: string | undefined,
  today: string,
): { openDate: string; closeDate: string } | null {
  if (servCode.alwaysAsap) {
    return { openDate: today, closeDate: today };
  }

  if (!dateRanges.isValidDateRange(servCode.dateRange)) return null;

  const employeeAvailableFrom = employeeLatestPrinted
    ? dateStrings.nextWeekdayAfter(employeeLatestPrinted)
    : null;

  const servCodePoolStart = employeeLatestPrinted
    ? (perDay.projectionStartDate ?? (today > servCode.dateRange.min ? today : servCode.dateRange.min))
    : (today > servCode.dateRange.min ? today : servCode.dateRange.min);

  const openDate =
    employeeAvailableFrom && employeeAvailableFrom > servCodePoolStart
      ? employeeAvailableFrom
      : servCodePoolStart;

  const isOverdue = today > servCode.dateRange.max;
  let closeDate: string;

  if (isOverdue && perDay.activeAsapCSP.price > 0 && teamStats.teamAvgCSP.price > 0) {
    const daysNeeded = Math.ceil(perDay.activeAsapCSP.price / teamStats.teamAvgCSP.price);
    closeDate = dateStrings.addWeekdays(today, daysNeeded);
  } else if (isOverdue) {
    closeDate = today;
  } else {
    closeDate = servCode.dateRange.max;
  }

  return { openDate, closeDate };
}

// Builds the simulation data list for one employee across all their assigned servCodes.
function buildSimDataList(
  employee: Employee,
  perDayMap: Map<string, { servCode: ServCodeDeep; activeAsapCSP: CSP; projectionStartDate: string | null }>,
  lookbackMap: EmployeeLookbackMap,
  teamStatsCache: Map<string, TeamStats>,
  employeeLatestPrintedDate: Map<string, string>,
  today: string,
): ServCodeSimData[] {
  const employeeLookback = lookbackMap.get(employee.employeeId);
  const employeeLatestPrinted = employeeLatestPrintedDate.get(employee.employeeId);
  const simDataList: ServCodeSimData[] = [];

  for (const servCodeId of employee.servCodeIds) {
    const perDay = perDayMap.get(servCodeId);
    if (!perDay) continue;

    const programTypeKey = perDay.servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
    const stats = employeeLookback?.get(programTypeKey) ?? null;
    const teamStats = teamStatsCache.get(servCodeId);
    if (!teamStats) continue;

    const dates = computeServCodeDates(
      perDay.servCode,
      perDay,
      teamStats,
      employeeLatestPrinted,
      today,
    );
    if (!dates) continue;

    let dailyRate: CSP;
    let maxDailyRate: CSP;
    let isEstimated: boolean;
    let pool: CSP;

    if (stats) {
      dailyRate = stats.avgDailyCSP;
      maxDailyRate = stats.maxDailyCSP;
      isEstimated = false;
      pool = computeWeightedPool(perDay.activeAsapCSP, stats.avgDailyCSP, teamStats.teamAvgCSP);
    } else {
      isEstimated = true;
      if (teamStats.knownCount > 0) {
        dailyRate = CSPOps.divideBy(teamStats.teamAvgCSP, teamStats.knownCount);
        maxDailyRate = CSPOps.divideBy(teamStats.teamMaxCSP, teamStats.knownCount);
      } else {
        dailyRate = { count: 1, size: 1, price: 1, rev: 1 };
        maxDailyRate = { count: 1, size: 1, price: 1, rev: 1 };
      }
      pool = CSPOps.divideBy(perDay.activeAsapCSP, Math.max(teamStats.totalAssigned, 1));
    }

    simDataList.push({
      servCodeId,
      openDate: dates.openDate,
      closeDate: dates.closeDate,
      pool,
      dailyRate,
      maxDailyRate,
      isEstimated,
    });
  }

  return simDataList;
}

// Runs the interval-by-interval simulation: drains the highest-priority open servCode
// in each time interval. Returns contributed CSP and first-worked date per servCode.
function runCascadeSimulation(
  simDataList: ServCodeSimData[],
  today: string,
): { contributed: Map<string, CSP>; availableFrom: Map<string, string> } {
  const boundarySet = new Set<string>([today]);
  for (const sim of simDataList) {
    boundarySet.add(sim.openDate);
    boundarySet.add(sim.closeDate);
  }
  const boundaries = [...boundarySet].sort();

  const remaining = new Map<string, CSP>();
  for (const sim of simDataList) {
    remaining.set(sim.servCodeId, { ...sim.pool });
  }

  const contributed = new Map<string, CSP>();
  const availableFrom = new Map<string, string>();
  for (const sim of simDataList) {
    contributed.set(sim.servCodeId, { ...baseCountSizePrice });
  }

  for (let i = 0; i < boundaries.length - 1; i++) {
    const intervalStart = boundaries[i];
    const intervalEnd = boundaries[i + 1];

    const intervalWeekdays = Math.max(
      0,
      dateRanges.countWeekdays({ min: intervalStart, max: intervalEnd }) - 1,
    );
    if (intervalWeekdays <= 0) continue;

    for (const sim of simDataList) {
      if (sim.openDate > intervalStart || sim.closeDate < intervalEnd) continue;

      const rem = remaining.get(sim.servCodeId)!;
      if (rem.count <= 0 && rem.size <= 0 && rem.price <= 0 && rem.rev <= 0) continue;

      if (!availableFrom.has(sim.servCodeId)) {
        availableFrom.set(sim.servCodeId, intervalStart);
      }

      const drained: CSP = {
        count: Math.min(sim.dailyRate.count * intervalWeekdays, rem.count),
        size: Math.min(sim.dailyRate.size * intervalWeekdays, rem.size),
        price: Math.min(sim.dailyRate.price * intervalWeekdays, rem.price),
        rev: Math.min(sim.dailyRate.rev * intervalWeekdays, rem.rev),
      };

      const prev = contributed.get(sim.servCodeId)!;
      contributed.set(sim.servCodeId, CSPOps.sum(prev, drained));

      remaining.set(sim.servCodeId, {
        count: Math.max(0, rem.count - drained.count),
        size: Math.max(0, rem.size - drained.size),
        price: Math.max(0, rem.price - drained.price),
        rev: Math.max(0, rem.rev - drained.rev),
      });

      break; // Only one servCode worked per interval
    }
  }

  return { contributed, availableFrom };
}

// Assembles the EmployeeCascadeEntry map for one employee from simulation results.
function buildByServCodeMap(
  simDataList: ServCodeSimData[],
  contributed: Map<string, CSP>,
  availableFrom: Map<string, string>,
  totalAvgDailyCSP: CSP | null,
  teamStatsCache: Map<string, TeamStats>,
): Map<string, EmployeeCascadeEntry> {
  const byServCode = new Map<string, EmployeeCascadeEntry>();

  for (const sim of simDataList) {
    const contributedCSP = contributed.get(sim.servCodeId) ?? { ...baseCountSizePrice };
    const from = availableFrom.get(sim.servCodeId);

    const teamStats = teamStatsCache.get(sim.servCodeId)!;
    const effectiveTotalAvg =
      totalAvgDailyCSP ??
      (teamStats.knownCount > 0 ? teamStats.avgTotalAvgDailyCSP : null);

    const fractionConsumed = effectiveTotalAvg
      ? CSPOps.safeDivide(contributedCSP, effectiveTotalAvg)
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

  return byServCode;
}

const selectEmployeeCascadeResults = createSelector(
  [
    rawPaceSelect.rawServCodePacesPerDayMap,
    selectEmployeeLookbackMap,
    employeeSelect.employeeMap,
    selectMainDate,
  ],
  (perDayMap, lookbackMap, employeeMap, mainDate): EmployeeCascadeResult[] => {
    const today = mainDate;
    const employeeLatestPrintedDate = buildEmployeeLatestPrintedDateMap(perDayMap);
    const teamStatsCache = buildTeamStatsCache(perDayMap, lookbackMap);

    const results: EmployeeCascadeResult[] = [];

    for (const employee of employeeMap.values()) {
      const employeeLookback = lookbackMap.get(employee.employeeId);
      const totalAvgDailyCSP = getTotalAvgDailyCSP(employeeLookback);

      const simDataList = buildSimDataList(
        employee,
        perDayMap,
        lookbackMap,
        teamStatsCache,
        employeeLatestPrintedDate,
        today,
      );

      const { contributed, availableFrom } = runCascadeSimulation(simDataList, today);

      const byServCode = buildByServCodeMap(
        simDataList,
        contributed,
        availableFrom,
        totalAvgDailyCSP,
        teamStatsCache,
      );

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
