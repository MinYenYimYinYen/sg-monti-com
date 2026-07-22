import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { AppState } from "@/store";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ACTIVE_ASAP_STATUSES = getServiceStatuses(["active", "asap"]);

const hasWorkRemaining = (services: { status: string; program: { status: string } }[]) =>
  services.some((s) => ACTIVE_ASAP_STATUSES.includes(s.status) && s.program.status === "9");

const selectAlwaysAsapServCodes = createSelector(
  [deepSelect.servCodes],
  (servCodes) =>
    servCodes.filter(
      (servCode) => servCode.alwaysAsap && hasWorkRemaining(servCode.services),
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

const selectMainDate = (state: AppState) => state.paceCrawler.mainDate;
const selectOverdueServCodes = createSelector(
  [selectMainDate, deepSelect.servCodes],
  (mainDate, servCodes) => {
    const overdue = servCodes.filter((servCode) => {
      if (!dateRanges.isValidDateRange(servCode.dateRange)) return false;
      if (servCode.alwaysAsap) return false;
      return servCode.dateRange.max < mainDate && hasWorkRemaining(servCode.services);
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
};
