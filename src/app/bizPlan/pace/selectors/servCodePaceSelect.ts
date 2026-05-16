import { createSelector } from "@reduxjs/toolkit";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/selectors/rawPaceSelect";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  ProgCodePace,
  ServCodePace,
  PaceCategory,
} from "@/app/bizPlan/pace/PaceTypes";

// ---------------------------------------------------------------------------
// Layer 4 — ServCode Assembly
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const servCodePaceSelect = {
  servCodePaces: selectServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  progCodePaces: selectProgCodePaces,
  urgentServCodePaces: selectUrgentServCodePaces,
};
