import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectPrintedByDate = createSelector(
  [centralSelect.services],
  (services) => {
    const printedByDate = new Grouper(
      services.filter((service) => service.status === "$"),
    )
      .groupBy((service) => service.program.nextDate)
      .toMap();
    return printedByDate;
  },
);


export const coverSheetsSelect = {
  printedByDate: selectPrintedByDate,
}
