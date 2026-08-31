import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { seasonPlanSelect } from "@/app/bizPlan/seasonPlan/seasonPlanSelect";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import {
  RequiredDailyEntry,
  DiffResult,
  OpenGroupRow,
  OpenGroupMemberRow,
  EmployeeCardData,
} from "@/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes";
import { holidaySelect } from "@/app/holiday/holidaySelect";

export type { OpenGroupRow, OpenGroupMemberRow, EmployeeCardData };

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

      for (const { groupId } of plan.groupAssignments) {
        const group = groupMap.get(groupId);
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

const selectOpenServCodesForEmployeeMap = createSelector(
  [selectOpenServCodesForEmployees],
  (openServCodesForEmployees): Map<string, OpenServCodesForEmployee> => {
    const result = new Map<string, OpenServCodesForEmployee>();
    for (const openServCodesForEmployee of openServCodesForEmployees) {
      result.set(openServCodesForEmployee.employee.employeeId, openServCodesForEmployee);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Step D1 — Remaining Weekdays per ServCode
// ---------------------------------------------------------------------------

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

        if (servCode.alwaysAsap) continue;

        const activePool = activePoolMap.get(servCodeId) ?? 0;
        if (activePool === 0) continue;

        const remainingWeekdays = remainingWeekdaysMap.get(servCodeId) ?? 0;
        const isOverdue = remainingWeekdays <= 0;

        const employeeRate = dailyRateMap.get(employeeId)?.get(servCodeId) ?? 0;
        const teamRate = teamDailyRateMap.get(servCodeId) ?? 0;

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
 * Each group row shows three values:
 * - Goal: employee's dailyRevenueGoal for this group ($/day)
 * - Actual: employee's totalAvgDailyPrice (lookback avg)
 * - Required: employee's proportional share of (groupPool / remainingWeekdays)
 *
 * The employee's share is weighted by their goal relative to the sum of all
 * employees' goals for the same group. When no goal is set, totalAvgDailyPrice
 * is used as the fallback weight.
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
    assignmentPlanSelect.goalByEmployeeByGroup,
    assignmentPlanSelect.assignmentsByEmployeeId,
    seasonPlanSelect.groupScheduleMap,
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
    goalByEmployeeByGroup,
    assignmentsByEmployeeId,
    groupScheduleMap,
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

    // Pre-compute sum of goals per groupId across all employees.
    // Used to compute each employee's proportional share of the group's required rate.
    // Falls back to totalAvgDailyPrice when no goal is set for an employee.
    const sumGoalsByGroup = new Map<string, number>();
    const sumAvgsByGroup = new Map<string, number>();
    for (const [employeeId, plan] of assignmentsByEmployeeId) {
      const employeeAvg = totalAvgDailyPriceMap.get(employeeId) ?? teamAvgTotalDailyPrice;
      for (const { groupId, dailyRevenueGoal } of plan.groupAssignments) {
        const contribution = dailyRevenueGoal ?? employeeAvg;
        sumGoalsByGroup.set(groupId, (sumGoalsByGroup.get(groupId) ?? 0) + contribution);
        sumAvgsByGroup.set(groupId, (sumAvgsByGroup.get(groupId) ?? 0) + employeeAvg);
      }
    }

    const cards: EmployeeCardData[] = [];

    for (const { employee, openServCodes, openGroupIds } of openServCodesForEmployees) {
      const employeeId = employee.employeeId;
      const diffByServCode = diffResultMap.get(employeeId);
      const assignedServCodeIds = openServCodes.map((sc) => sc.servCodeId);
      const goalByGroup = goalByEmployeeByGroup.get(employeeId);

      const isOnLeave = employee.plannedTimeOff.some(
        (pto) => mainDate >= pto.dateRange.min && mainDate <= pto.dateRange.max,
      );

      const totalAvgDailyPrice =
        totalAvgDailyPriceMap.get(employeeId) ?? teamAvgTotalDailyPrice;

      // Build open entry rows — one OpenGroupRow per open groupId
      const openEntryRows: OpenGroupRow[] = [];

      for (const groupId of openGroupIds) {
        const group = groupMap.get(groupId);
        const servCodeIds = group?.servCodeIds ?? groupId.split("+");
        const label = group?.label ?? groupId;
        const goalDailyPrice = goalByGroup?.get(groupId) ?? null;

        // The season plan's planned end for this group (used as the deadline for required rate)
        const groupSchedule = groupScheduleMap.get(groupId);
        const plannedEnd = groupSchedule?.plannedEnd ?? null;

        // Build per-member rows (only members with pool > 0)
        const members: OpenGroupMemberRow[] = [];
        let combinedPool = 0;
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

        const latestRemainingWeekdays = latestScMax
          ? Math.max(0, dateRanges.weekdaysBetween(mainDate, latestScMax))
          : 0;

        // Compute the group's total required rate using the season plan's plannedEnd as the
        // deadline (preferred), falling back to the latest member scMax.
        const deadlineDate = plannedEnd ?? latestScMax;
        // Allow negative values — past-deadline groups still need a meaningful delta for goal/avg rows.
        const deadlineWeekdays = deadlineDate
          ? dateRanges.weekdaysBetween(mainDate, deadlineDate)
          : 0;
        // Required rate is only meaningful when deadline is in the future.
        const groupRequiredRate = deadlineWeekdays > 0
          ? combinedPool / deadlineWeekdays
          : 0;

        // Employee's proportional share of the group's required rate.
        // Weight = this employee's goal (or totalAvgDailyPrice fallback) / sum of all goals for this group.
        const employeeWeight = goalDailyPrice ?? totalAvgDailyPrice;
        const sumGoals = sumGoalsByGroup.get(groupId) ?? employeeWeight;
        const sumAvgs = sumAvgsByGroup.get(groupId) ?? totalAvgDailyPrice;
        const shareRatio = sumGoals > 0 ? employeeWeight / sumGoals : 1;
        const employeeRequiredRate = groupRequiredRate * shareRatio;

        const diffPrice = employeeRequiredRate - totalAvgDailyPrice;
        const diffPercent = totalAvgDailyPrice > 0
          ? diffPrice / totalAvgDailyPrice
          : null;

        openEntryRows.push({
          kind: "group" as const,
          groupId,
          label,
          servCodeIds,
          combinedPool,
          requiredDailyPrice: employeeRequiredRate,
          goalDailyPrice,
          historicalDailyPrice: totalAvgDailyPrice,
          diffPrice,
          diffPercent,
          latestScMax,
          latestRemainingWeekdays,
          planDeadlineWeekdays: deadlineWeekdays,
          groupRequiredRate,
          sumGoals,
          sumAvgs,
          planDeadline: plannedEnd,
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
