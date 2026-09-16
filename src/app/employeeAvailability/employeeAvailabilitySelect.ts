import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

const selectDocs = (state: AppState) => state.employeeAvailability.docs;

const selectAll = createSelector([selectDocs], (docs): EmployeeAvailability[] => docs);

/** Map<employeeId, EmployeeAvailability> for O(1) lookups. */
const selectByEmployeeId = createSelector(
  [selectDocs],
  (docs): Map<string, EmployeeAvailability> =>
    new Grouper(docs).toUniqueMap((d) => d.employeeId),
);

export const employeeAvailabilitySelect = {
  all: selectAll,
  byEmployeeId: selectByEmployeeId,
};
