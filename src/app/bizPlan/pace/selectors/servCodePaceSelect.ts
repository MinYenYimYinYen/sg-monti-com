import { createSelector } from "@reduxjs/toolkit";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/selectors/rawPaceSelect";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import {
  CSP,
  CSPOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { mostUrgentCategory } from "@/app/bizPlan/pace/_lib/paceUtils";
import {
  ProgCodePace,
  ServCodePace,
  PaceCategory,
  EmployeeCascadeEntry,
  EmployeeCascadeResult,
} from "@/app/bizPlan/pace/PaceTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

// ---------------------------------------------------------------------------
// Layer 4 — ServCode Assembly
// ---------------------------------------------------------------------------

// Returns the cascade entry for an employee, or a zero-valued fallback if not yet in cascade.
function getEmployeeShareEntry(
  employee: Employee,
  cascadeMap: Map<string, EmployeeCascadeResult>,
  servCodeId: string,
): EmployeeCascadeEntry & { employee: Employee } {
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
    timelineEvents: [],
  };
}

const selectServCodePaces = createSelector(
  [
    rawPaceSelect.rawServCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    cascadeSelect.employeeCascadeMap,
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

      const employeeShares = servCode.assignedTo.map((employee) =>
        getEmployeeShareEntry(employee, cascadeMap, servCodeId),
      );

      // teamExpectedCSP: sum of contributedCSP normalized to per-day
      const totalContributed = CSPOps.sumAll(
        employeeShares.map((s) => s.contributedCSP),
      );
      const teamExpectedCSP = CSPOps.divideBy(totalContributed, unfinishedDayCount);

      // teamAvgCapacity: sum of dailyRate across all employees
      const teamAvgCapacity = CSPOps.sumAll(
        employeeShares.map((s) => s.dailyRate),
      );

      const paceDelta = CSPOps.subtract(teamExpectedCSP, unfinishedRate);
      const paceDeltaPct = CSPOps.safeDivide(paceDelta, unfinishedRate);
      const activeAsapCSP = perDay?.activeAsapCSP ?? { ...baseCountSizePrice };

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
        activeAsapCSP,
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

      const unfinishedCSP = CSPOps.sumAll(
        servCodePaces.map((p) => p.unfinishedCSP),
      );
      const finishedCSP = CSPOps.sumAll(
        servCodePaces.map((p) => p.finishedCSP),
      );

      return { progCode, servCodePaces, category, unfinishedCSP, finishedCSP } satisfies ProgCodePace;
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

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const servCodePaceSelect = {
  servCodePaces: selectServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  progCodePaces: selectProgCodePaces,
  urgentServCodePaces: selectUrgentServCodePaces,
};
