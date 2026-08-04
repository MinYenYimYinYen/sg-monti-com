import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { PriorityService } from "@/app/priorityService/PriorityServiceTypes";

const selectDocs = (state: AppState) => state.priorityService.docs;

const selectPriorityServices = createSelector(
  [selectDocs, centralSelect.services],
  (docs, services) => {
    const serviceMap = new Grouper(services).toUniqueMap((s) => s.servId);

    const hydrated: PriorityService[] = [];

    for (const doc of docs) {
      const service = serviceMap.get(doc.servId);
      // Exclude if service not found in active context or is completed
      if (!service || service.status === "S") continue;

      hydrated.push({ ...doc, service });
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
