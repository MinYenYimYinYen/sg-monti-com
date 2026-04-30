import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CountSizePriceOps } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { PaceCategory, ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppState } from "@/store";

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

const selectSortMode = (state: AppState) => state.pace.sortMode;
const selectActiveFilters = (state: AppState) => state.pace.activeFilters;
const selectUnfinishedOnly = (state: AppState) => state.pace.unfinishedOnly;
const selectSelectedServCodeId = (state: AppState) =>
  state.pace.selectedServCodeId;

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

      const pace: ServCodePace = {
        servCode,
        daysRemaining: servCode.x.daysRemaining,
        category: getCategory(servCode),
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
      };
      return pace;
    }),
);

const selectServCodePaceMap = createSelector([selectServCodePaces], (paces) =>
  new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

const selectFilteredSortedPaces = createSelector(
  [selectServCodePaces, selectSortMode, selectActiveFilters, selectUnfinishedOnly],
  (paces, sortMode, activeFilters, unfinishedOnly) => {
    const filtered = paces.filter((p) => {
      if (!activeFilters.includes(p.category)) return false;
      if (unfinishedOnly && p.unfinishedCSP.count === 0) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "byId") {
        return a.servCode.servCodeId.localeCompare(b.servCode.servCodeId);
      }

      // byDateRange: asap first, notSet last, then by dateRange.min, secondary by id
      const categoryOrder = (p: ServCodePace): number => {
        if (p.category === "asap") return 0;
        if (p.category === "notSet") return 3;
        return 1;
      };

      const orderA = categoryOrder(a);
      const orderB = categoryOrder(b);
      if (orderA !== orderB) return orderA - orderB;

      const minA = a.servCode.dateRange.min ?? "";
      const minB = b.servCode.dateRange.min ?? "";
      if (minA !== minB) return minA.localeCompare(minB);

      return a.servCode.servCodeId.localeCompare(b.servCode.servCodeId);
    });
  },
);

const selectSelectedPace = createSelector(
  [selectServCodePaceMap, selectSelectedServCodeId],
  (paceMap, selectedId) => (selectedId ? (paceMap.get(selectedId) ?? null) : null),
);

export const paceSelect = {
  servCodePaces: selectServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  filteredSortedPaces: selectFilteredSortedPaces,
  selectedPace: selectSelectedPace,
  sortMode: selectSortMode,
  activeFilters: selectActiveFilters,
  unfinishedOnly: selectUnfinishedOnly,
  selectedServCodeId: selectSelectedServCodeId,
};
