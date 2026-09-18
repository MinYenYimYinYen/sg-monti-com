import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { PriorityService } from "@/app/priorityService/PriorityServiceTypes";
const PRIORITY_ELIGIBLE_STATUSES = new Set(["Y", "*"]);

const selectDocs = (state: AppState) => state.priorityService.docs;

const selectPriorityServices = createSelector(
  [centralSelect.services],
  (services) => {
    const hydrated: PriorityService[] = [];

    for (const service of services) {
      if (!service.priorityService) continue;
      // Service must be active (Y) or asap (*) — printed and completed are excluded.
      if (!PRIORITY_ELIGIBLE_STATUSES.has(service.status)) continue;
      // Program must be active (status "9") and not on hold.
      // Credit hold is intentionally NOT checked here — a priority flag is a manual
      // override signal and we want credit-hold customers to remain visible so the
      // production manager can decide whether to schedule them anyway.
      if (service.program.status !== "9") continue;
      if (service.program.x.isOnHold) continue;

      hydrated.push({ ...service.priorityService, service });
    }

    // Sort ascending by date (single date or dateRange.min)
    hydrated.sort((a, b) => {
      const aDate = a.date ?? a.dateRange?.min ?? "";
      const bDate = b.date ?? b.dateRange?.min ?? "";
      return aDate.localeCompare(bDate);
    });

    return hydrated;
  },
);

const selectPriorityServiceMap = createSelector(
  [selectPriorityServices],
  (priorityServices) =>
    new Grouper(priorityServices).toUniqueMap((ps) => ps.servId),
);

export const priorityServiceSelect = {
  docs: selectDocs,
  priorityServices: selectPriorityServices,
  priorityServiceMap: selectPriorityServiceMap,
};
