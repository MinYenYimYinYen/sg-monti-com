import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import {
  RequiredDailyEntry,
  DiffResult,
  OpenServCodeRow,
  OpenGroupRow,
  OpenGroupMemberRow,
  EmployeeCardData,
} from "@/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes";
import { holidaySelect } from "@/app/holiday/holidaySelect";

export type { OpenServCodeRow, OpenGroupRow, OpenGroupMemberRow, EmployeeCardData };

// ---------------------------------------------------------------------------
// D0 output type
// ---------------------------------------------------------------------------

export type OpenServCodesForEmployee = {
  employee: Employee;
  openServCodes: ServCodeDeep[];  // flat, for D1/D2/D3
  openGroupIds: string[];         // group-aware, for D5 card assembly
};

const selectMainDate = (state: AppState): string => state.paceCrawler.mainDate;

// ---------------------------------------------------------------------------
// Step D0 — Open ServCodes per Employee
// ---------------------------------------------------------------------------

/**
 * "Which servCodes are open for each assigned employee on mainDate?"
 *
 * A servCode is open when ALL of the following are true:
 * 1. It is in the employee's assignment plan (as a member of an assigned group).
 * 2. It has at least one actionable service (status "Y" or "*").
 * 3. mainDate is within servCode.dateRange OR servCode.alwaysAsap === true.
 *
 * openServCodes: flat list for D1/D2/D3.
 * openGroupIds: group-aware list for D5 card assembly — preserves group structure,
 *   filtered to groups with at least one open member.
 */
const selectOpenServCodesForEmployees = createSelector(
  [
    assignmentPlanSelect.assignmentsByEmployeeId,
    assignmentGroupSelect.groupMap,
    employeeSelect.employeeMap,
    deepSelect.servCodeMap,
    selectMainDate,
  ],
  (
    assignmentsByEmployeeId,
    groupMap,
    employeeMap,
    servCodeDeepMap,
    mainDate,
  ): OpenServCodesForEmployee[] => {
    const result: OpenServCodesForEmployee[] = [];

    for (const [employeeId, plan] of assignmentsByEmployeeId) {
      const employee = employeeMap.get(employeeId);
      if (!employee) continue;

      const openServCodes: ServCodeDeep[] = [];
      const openServCodeIds = new Set<string>();
      const openGroupIds: string[] = [];

      for (const groupId of plan.groupIds) {
        const group = groupMap.get(groupId);
        // Fall back to splitting groupId on "+" if group not yet loaded
        const servCodeIds = group?.servCodeIds ?? groupId.split("+");

        let anyMemberOpen = false;
        for (const servCodeId of servCodeIds) {
          const servCode = servCodeDeepMap.get(servCodeId);
          if (!servCode) continue;

          const hasWorkRemaining = servCode.services.some((s) => s.x.isActionable);
          if (!hasWorkRemaining) continue;

          const isOpen =
            servCode.alwaysAsap ||
            (dateRanges.isValidDateRange(servCode.dateRange) &&
              dateStrings.isInRange(mainDate, servCode.dateRange));
          if (!isOpen) continue;

          anyMemberOpen = true;
          if (!openServCodeIds.has(servCodeId)) {
            openServCodes.push(servCode);
            openServCodeIds.add(servCodeId);
          }
        }

        if (anyMemberOpen) {
          openGroupIds.push(groupId);
        }
      }

      result.push({ employee, openServCodes, openGroupIds });
    }

    return result;
  },
);

/**
 * Map form of D0 — keyed by employeeId for O(1) lookups in downstream selectors.
 */
const selectOpenServCodesForEmployeeMap = createSelector(
  [selectOpenServCodesForEmployees],
  (entries): Map<string, OpenServCodesForEmployee> => {
    const result = new Map<string, OpenServCodesForEmployee>();
    for (const entry of entries) {
      result.set(entry.employee.employeeId, entry);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Step D1 — Remaining Weekdays per ServCode
// ---------------------------------------------------------------------------

/**
 * "How many weekdays remain in each servCode's committed window from mainDate?"
 *
 * = weekdaysBetween(mainDate, servCode.dateRange.max) for each non-alwaysAsap servCode.
 * Includes overdue servCodes (value <= 0) so the DiffChecker can flag them.
 * Excludes alwaysAsap servCodes — they have no committed window.
 *
 * Map<servCodeId, number>
 */
const selectRemainingWeekdaysByServCode = createSelector(
  [progServSelect.servCodeMap, selectMainDate],
  (servCodeMap, mainDate): Map<string, number> => {
    const result = new Map<string, number>();
    for (const servCode of servCodeMap.values()) {
      if (servCode.alwaysAsap) continue;
      if (!dateRanges.isValidDateRange(servCode.dateRange)) continue;
      const remaining = dateRanges.weekdaysBetween(mainDate, servCode.dateRange.max);
      result.set(servCode.servCodeId, remaining);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Step D2 — Team Daily Rate per ServCode
// ---------------------------------------------------------------------------

/**
 * "What is the combined daily rate of all assigned employees for each servCode?"
 *
 * = sum of dailyRateByEmployeeByServCode[employeeId][servCodeId] across all employees
 *   assigned to that servCode (from assignmentsByServCodeId).
 *
 * This is the denominator for computing each employee's proportional share.
 * A zero team rate means no assigned employees have lookback data for this servCode.
 *
 * Map<servCodeId, number>
 */
const selectTeamDailyRateByServCode = createSelector(
  [
    paceCrawlerSelect.dailyRateByEmployeeByServCode,
    assignmentPlanSelect.assignmentsByServCodeId,
  ],
  (dailyRateMap, assignmentsByServCodeId): Map<string, number> => {
    const result = new Map<string, number>();
    for (const [servCodeId, employeeIds] of assignmentsByServCodeId) {
      let teamTotal = 0;
      for (const employeeId of employeeIds) {
        const rate = dailyRateMap.get(employeeId)?.get(servCodeId) ?? 0;
        teamTotal += rate;
      }
      result.set(servCodeId, teamTotal);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Step D3 — Required Daily Price per Employee per ServCode
// ---------------------------------------------------------------------------

/**
 * "How much price/day does each employee need to produce on each servCode to finish on time?"
 *
 * Iterates D0's open servCodes per employee (already filtered by services.count and dateRange).
 * Skips alwaysAsap servCodes (no committed window) and servCodes with zero active pool.
 *
 * For each employee × servCode:
 * - employeeShare = activePool × (employeeRate / teamRate)
 * - requiredDailyPrice = employeeShare / remainingWeekdays
 *
 * Map<employeeId, Map<servCodeId, RequiredDailyEntry>>
 */
const selectRequiredDailyPriceByEmployeeByServCode = createSelector(
  [
    selectOpenServCodesForEmployees,
    selectRemainingWeekdaysByServCode,
    selectTeamDailyRateByServCode,
    paceCrawlerSelect.activePoolPriceByServCode,
    paceCrawlerSelect.dailyRateByEmployeeByServCode,
  ],
  (
    openServCodesForEmployees,
    remainingWeekdaysMap,
    teamDailyRateMap,
    activePoolMap,
    dailyRateMap,
  ): Map<string, Map<string, RequiredDailyEntry>> => {
    const result = new Map<string, Map<string, RequiredDailyEntry>>();

    for (const { employee, openServCodes } of openServCodesForEmployees) {
      const employeeId = employee.employeeId;
      const byServCode = new Map<string, RequiredDailyEntry>();

      for (const servCode of openServCodes) {
        const servCodeId = servCode.servCodeId;

        // DiffChecker requires a committed window — skip alwaysAsap
        if (servCode.alwaysAsap) continue;

        const activePool = activePoolMap.get(servCodeId) ?? 0;
        if (activePool === 0) continue; // done

        const remainingWeekdays = remainingWeekdaysMap.get(servCodeId) ?? 0;
        const isOverdue = remainingWeekdays <= 0;

        const employeeRate = dailyRateMap.get(employeeId)?.get(servCodeId) ?? 0;
        const teamRate = teamDailyRateMap.get(servCodeId) ?? 0;

        // Proportional share: if team has no rate data, employee gets the full pool
        const employeeShare =
          teamRate > 0 ? activePool * (employeeRate / teamRate) : activePool;

        const requiredDailyPrice = isOverdue
          ? Infinity
          : employeeShare / remainingWeekdays;

        byServCode.set(servCodeId, {
          servCodeId,
          activePool,
          remainingWeekdays,
          employeeShare,
          requiredDailyPrice,
          isOverdue,
        });
      }

      if (byServCode.size > 0) {
        result.set(employeeId, byServCode);
      }
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Step D4 — Diff Result per Employee per ServCode
// ---------------------------------------------------------------------------

/**
 * "Is the employee ahead or behind their historical average for each servCode?"
 *
 * Compares requiredDailyPrice (from D3) against historicalDailyPrice (simulator baseline).
 * diffPrice > 0 = behind (needs to do more), diffPrice < 0 = ahead.
 *
 * Map<employeeId, Map<servCodeId, DiffResult>>
 */
const selectDiffResultByEmployeeByServCode = createSelector(
  [
    selectRequiredDailyPriceByEmployeeByServCode,
    paceCrawlerSelect.dailyRateByEmployeeByServCode,
  ],
  (
    requiredMap,
    dailyRateMap,
  ): Map<string, Map<string, DiffResult>> => {
    const result = new Map<string, Map<string, DiffResult>>();

    for (const [employeeId, byServCode] of requiredMap) {
      const diffByServCode = new Map<string, DiffResult>();

      for (const [servCodeId, entry] of byServCode) {
        const historicalDailyPrice =
          dailyRateMap.get(employeeId)?.get(servCodeId) ?? 0;

        // For overdue servCodes, cap required at the employee's daily capacity (historical avg).
        const effectiveRequiredDailyPrice = entry.isOverdue
          ? Math.min(historicalDailyPrice, entry.employeeShare)
          : entry.requiredDailyPrice;

        const diffPrice = isFinite(effectiveRequiredDailyPrice)
          ? effectiveRequiredDailyPrice - historicalDailyPrice
          : Infinity;

        const diffPercent =
          historicalDailyPrice > 0 && isFinite(diffPrice)
            ? diffPrice / historicalDailyPrice
            : null;

        diffByServCode.set(servCodeId, {
          servCodeId,
          requiredDailyPrice: effectiveRequiredDailyPrice,
          historicalDailyPrice,
          diffPrice,
          diffPercent,
          isOverdue: entry.isOverdue,
          isAhead: isFinite(diffPrice) && diffPrice < 0,
          isBehind: !isFinite(diffPrice) || diffPrice > 0,
        });
      }

      if (diffByServCode.size > 0) {
        result.set(employeeId, diffByServCode);
      }
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Step D5 — Employee Card Data (Final Assembly)
// ---------------------------------------------------------------------------

/**
 * "One card per assigned employee with all display data assembled."
 *
 * openEntries: D0's group-aware groupIds, enriched with DiffChecker data.
 * Each groupId is resolved to an OpenGroupRow with per-member required rates and combined header.
 *
 * Group header required rate = sum of per-member required rates (each: pool / weekdays_to_scMax).
 * Group historical rate = employee's totalAvgDailyPrice.
 *
 * isAlreadyRouted: employee has any printed service (status "$") with schedDate === mainDate.
 * isOnLeave: employee has personal planned time off covering mainDate.
 * isHoliday: a company holiday covers mainDate (same for all employees).
 *
 * Sorted: employees with open entries first (by name), then employees with no open entries.
 */
const selectEmployeeCardData = createSelector(
  [
    selectOpenServCodesForEmployees,
    selectDiffResultByEmployeeByServCode,
    paceCrawlerSelect.activePoolPriceByServCode,
    paceCrawlerSelect.totalAvgDailyPriceByEmployee,
    paceCrawlerSelect.teamAvgTotalDailyPrice,
    deepSelect.servCodes,
    progServSelect.servCodeMap,
    selectMainDate,
    holidaySelect.holidayDates,
    assignmentGroupSelect.groupMap,
  ],
  (
    openServCodesForEmployees,
    diffResultMap,
    activePoolMap,
    totalAvgDailyPriceMap,
    teamAvgTotalDailyPrice,
    servCodes,
    servCodeMap,
    mainDate,
    holidayDates,
    groupMap,
  ): EmployeeCardData[] => {
    // Build already-routed set: employees with a printed service on mainDate
    const alreadyRoutedEmployeeIds = new Set<string>();
    for (const servCode of servCodes) {
      for (const service of servCode.services) {
        if (
          service.status === "$" &&
          service.lastAssigned.schedDate === mainDate &&
          service.lastAssigned.employeeId
        ) {
          alreadyRoutedEmployeeIds.add(service.lastAssigned.employeeId);
        }
      }
    }

    const isHoliday = holidayDates.has(mainDate);

    const cards: EmployeeCardData[] = [];

    for (const { employee, openServCodes, openGroupIds } of openServCodesForEmployees) {
      const employeeId = employee.employeeId;
      const diffByServCode = diffResultMap.get(employeeId);
      const assignedServCodeIds = openServCodes.map((sc) => sc.servCodeId);

      const isOnLeave = employee.plannedTimeOff.some(
        (pto) => mainDate >= pto.dateRange.min && mainDate <= pto.dateRange.max,
      );

      const totalAvgDailyPrice =
        totalAvgDailyPriceMap.get(employeeId) ?? teamAvgTotalDailyPrice;

      // Build open entry rows — one OpenGroupRow per open groupId
      const openEntryRows: (OpenServCodeRow | OpenGroupRow)[] = [];

      for (const groupId of openGroupIds) {
        const group = groupMap.get(groupId);
        const servCodeIds = group?.servCodeIds ?? groupId.split("+");
        const label = group?.label ?? groupId;

        // Build per-member rows (only members with pool > 0)
        const members: OpenGroupMemberRow[] = [];
        let combinedPool = 0;
        let sumRequiredRates = 0;
        let latestScMax = "";
        let anyOverdue = false;

        for (const servCodeId of servCodeIds) {
          const memberPool = activePoolMap.get(servCodeId) ?? 0;
          if (memberPool <= 0) continue;

          const servCode = servCodeMap.get(servCodeId);
          const scMax = servCode?.dateRange.max ?? "";
          const remainingWeekdays = scMax
            ? Math.max(0, dateRanges.weekdaysBetween(mainDate, scMax))
            : 0;
          const isOverdue = remainingWeekdays <= 0;
          const memberRequired = isOverdue || remainingWeekdays === 0
            ? 0
            : memberPool / remainingWeekdays;

          combinedPool += memberPool;
          sumRequiredRates += memberRequired;
          if (!latestScMax || scMax > latestScMax) latestScMax = scMax;
          if (isOverdue) anyOverdue = true;

          members.push({
            servCodeId,
            poolRemaining: memberPool,
            requiredDailyPrice: memberRequired,
            remainingWeekdays,
            scMax,
            isOverdue,
          });
        }

        if (combinedPool === 0) continue; // all members done

        // If the group has exactly one member, render as a single row for cleaner display
        if (members.length === 1) {
          const member = members[0];
          const diff = diffByServCode?.get(member.servCodeId);
          openEntryRows.push({
            kind: "single",
            servCodeId: member.servCodeId,
            historicalDailyPrice: diff?.historicalDailyPrice ?? 0,
            requiredDailyPrice: diff?.requiredDailyPrice ?? member.requiredDailyPrice,
            diffPrice: diff?.diffPrice ?? 0,
            diffPercent: diff?.diffPercent ?? null,
            poolRemaining: member.poolRemaining,
            remainingWeekdays: member.remainingWeekdays,
            isOverdue: member.isOverdue,
            isAhead: diff?.isAhead ?? false,
            isBehind: diff?.isBehind ?? false,
          });
          continue;
        }

        const latestRemainingWeekdays = latestScMax
          ? Math.max(0, dateRanges.weekdaysBetween(mainDate, latestScMax))
          : 0;

        const diffPrice = sumRequiredRates - totalAvgDailyPrice;
        const diffPercent = totalAvgDailyPrice > 0
          ? diffPrice / totalAvgDailyPrice
          : null;

        openEntryRows.push({
          kind: "group",
          groupId,
          label,
          servCodeIds,
          combinedPool,
          requiredDailyPrice: sumRequiredRates,
          historicalDailyPrice: totalAvgDailyPrice,
          diffPrice,
          diffPercent,
          latestScMax,
          latestRemainingWeekdays,
          isOverdue: anyOverdue,
          isAhead: isFinite(diffPrice) && diffPrice < 0,
          isBehind: !isFinite(diffPrice) || diffPrice > 0,
          members,
        });
      }

      cards.push({
        employee,
        isAlreadyRouted: alreadyRoutedEmployeeIds.has(employeeId),
        isOnLeave,
        isHoliday,
        openEntries: openEntryRows,
        assignedServCodeIds,
      });
    }

    // Sort: employees with open entries first (by name), then no-open (by name)
    cards.sort((a, b) => {
      const aHasOpen = a.openEntries.length > 0;
      const bHasOpen = b.openEntries.length > 0;
      if (aHasOpen !== bHasOpen) return aHasOpen ? -1 : 1;
      return a.employee.name.localeCompare(b.employee.name);
    });

    return cards;
  },
);

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const employeeCardSelect = {
  // Step D0
  openServCodesForEmployees: selectOpenServCodesForEmployees,
  openServCodesForEmployeeMap: selectOpenServCodesForEmployeeMap,
  // Step D1
  remainingWeekdaysByServCode: selectRemainingWeekdaysByServCode,
  // Step D2
  teamDailyRateByServCode: selectTeamDailyRateByServCode,
  // Step D3
  requiredDailyPriceByEmployeeByServCode: selectRequiredDailyPriceByEmployeeByServCode,
  // Step D4
  diffResultByEmployeeByServCode: selectDiffResultByEmployeeByServCode,
  // Step D5
  employeeCardData: selectEmployeeCardData,
};
