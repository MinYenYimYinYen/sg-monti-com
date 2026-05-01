import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CountSizePriceOps } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  EmployeeShare,
  PaceCategory,
  ProgCodePace,
  ServCodePace,
} from "@/app/bizPlan/pace/PaceType";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppState } from "@/store";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

function getCategory(servCode: ServCodeDeep): PaceCategory {
  if (servCode.alwaysAsap) return "asap";
  if (!dateRanges.isValidDateRange(servCode.dateRange)) return "notSet";
  const today = dateStrings.today();
  if (today < servCode.dateRange.min) return "notStarted";
  if (today > servCode.dateRange.max) return "overdue";
  return "inProgress";
}

function getCSPTotal(services: Service[]) {
  const csps = services.map((s) => CountSizePriceOps.fromService(s));
  return CountSizePriceOps.sumAll(csps);
}

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

//Slice Selectors
const selectSortMode = (state: AppState) => state.pace.sortMode;
const selectActiveFilters = (state: AppState) => state.pace.activeFilters;
const selectUnfinishedOnly = (state: AppState) => state.pace.unfinishedOnly;
const selectSelectedServCodeIds = (state: AppState) =>
  state.pace.selectedServCodeIds;
const selectSelectedProgCodeId = (state: AppState) =>
  state.pace.selectedProgCodeId;
const selectSelectionSource = (state: AppState) => state.pace.selectionSource;

const selectServCodePaces = createSelector(
  [deepSelect.servCodes],
  (servCodes) =>
    servCodes.map((servCode) => {
      const finished = servCode.services.filter((s) => s.status === "S");
      const finishedCSP = getCSPTotal(finished);
      const finishedRate = CountSizePriceOps.divideBy(
        finishedCSP,
        servCode.x.daysElapsed,
      );

      const unfinished = servCode.services.filter((s) =>
        getServiceStatuses(["printed", "active", "asap"]).includes(s.status),
      );
      const unfinishedCSP = getCSPTotal(unfinished);
      const unfinishedRate = CountSizePriceOps.divideBy(
        unfinishedCSP,
        servCode.x.daysRemaining,
      );

      const employeeShares: EmployeeShare[] = servCode.assignedTo.map(
        (employee) => ({
          employee,
          // Share of the required daily pace, not total remaining work
          shareCSP: CountSizePriceOps.divideBy(
            unfinishedRate,
            servCode.assignedTo.length,
          ),
        }),
      );

      const pace: ServCodePace = {
        servCode,
        daysRemaining: servCode.x.daysRemaining,
        category: getCategory(servCode),
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
        employeeShares,
      };
      return pace;
    }),
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

const selectFilteredSortedProgCodePaces = createSelector(
  [
    selectProgCodePaces,
    selectSortMode,
    selectActiveFilters,
    selectUnfinishedOnly,
  ],
  (progCodePaces, sortMode, activeFilters, unfinishedOnly): ProgCodePace[] => {
    const filtered = progCodePaces.filter((p) => {
      const hasMatchingCategory = p.servCodePaces.some((sp) =>
        activeFilters.includes(sp.category),
      );
      if (!hasMatchingCategory) return false;
      if (unfinishedOnly && p.unfinishedCSP.count === 0) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "byId") {
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      // byDateRange: most urgent first, then earliest dateRange.min, then alphabetical
      const urgencyA = CATEGORY_URGENCY[a.category];
      const urgencyB = CATEGORY_URGENCY[b.category];
      if (urgencyA !== urgencyB) return urgencyA - urgencyB;

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
    });
  },
);

// "Active" = inProgress + asap + overdue — all categories that need attention now
const selectActiveServCodeIds = createSelector(
  [selectServCodePaces],
  (paces) =>
    paces
      .filter((p) =>
        p.category === "inProgress" ||
        p.category === "asap" ||
        p.category === "overdue",
      )
      .map((p) => p.servCode.servCodeId),
);

const selectSelectedPaces = createSelector(
  [selectServCodePaceMap, selectSelectedServCodeIds],
  (paceMap, ids) => {
    const selectedPacesMaybe = ids.map((id) => paceMap.get(id));
    return typeGuard.definedArray(selectedPacesMaybe);
  },
);

export const paceSelect = {
  servCodePaces: selectServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  progCodePaces: selectProgCodePaces,
  filteredSortedProgCodePaces: selectFilteredSortedProgCodePaces,
  activeServCodeIds: selectActiveServCodeIds,
  selectedPaces: selectSelectedPaces,
  selectedServCodeIds: selectSelectedServCodeIds,
  selectionSource: selectSelectionSource,
  selectedProgCodeId: selectSelectedProgCodeId,
  sortMode: selectSortMode,
  activeFilters: selectActiveFilters,
  unfinishedOnly: selectUnfinishedOnly,
};
