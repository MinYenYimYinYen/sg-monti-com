import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { AppState } from "@/store";

const selectAlwaysAsapServCodes = createSelector(
  [deepSelect.servCodes],
  (servCodes) =>
    servCodes.filter(
      (servCode) => servCode.alwaysAsap && servCode.services.length > 0,
    ),
);

const selectAlwaysAsapMap = createSelector(
  [selectAlwaysAsapServCodes],
  (servCodes) => new Grouper(servCodes).toUniqueMap((sc) => sc.servCodeId),
);

const selectCheckedServIds = (state: AppState): number[] =>
  state.urgent.checkedServIds;

const selectExpandedServCodeIds = (state: AppState): string[] =>
  state.urgent.expandedServCodeIds;

const selectShowOverdue = (state: AppState): boolean =>
  state.urgent.showOverdue;

const selectMainDate = (state: AppState) => state.paceCrawler.mainDate;
const selectOverdueServCodes = createSelector(
  [selectMainDate, deepSelect.servCodes],
  (mainDate, servCodes) => {
    const overdue = servCodes.filter((servCode) => {
      if (!dateRanges.isValidDateRange(servCode.dateRange)) return false;
      if (servCode.alwaysAsap) return false;
      return servCode.dateRange.max < mainDate && servCode.services.length > 0;
    });
    return overdue;
  },
);

export const urgentServCodesSelect = {
  alwaysAsapServCodes: selectAlwaysAsapServCodes,
  alwaysAsapMap: selectAlwaysAsapMap,
  overdueServCodes: selectOverdueServCodes,
  checkedServIds: selectCheckedServIds,
  expandedServCodeIds: selectExpandedServCodeIds,
  showOverdue: selectShowOverdue,
};
