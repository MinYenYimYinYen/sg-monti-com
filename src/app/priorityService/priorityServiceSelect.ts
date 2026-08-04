import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { PriorityService } from "@/app/priorityService/PriorityServiceTypes";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ELIGIBLE_STATUSES = getServiceStatuses(["active", "asap", "printed"]);

const selectDocs = (state: AppState) => state.priorityService.docs;

const selectPriorityServices = createSelector(
  [centralSelect.services],
  (services) => {
    const hydrated: PriorityService[] = [];

    for (const service of services) {
      if (!service.priorityService) continue;
      // Only include services with schedulable statuses
      if (!ELIGIBLE_STATUSES.includes(service.status)) continue;

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
