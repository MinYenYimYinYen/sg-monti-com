// THROWAWAY: see prepayProbe.ts.
import { createSelector } from "@reduxjs/toolkit";
import { salesTaxSelect } from "@/app/salesTax/salesTaxSelect";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { buildPrepayProbe } from "@/app/salesTax/_throwaway/prepayProbe";

export const prepayProbeSelect = createSelector(
  [salesTaxSelect.services, salesTaxUISelect.dateRange],
  (services, dateRange) => (dateRange ? buildPrepayProbe({ services, dateRange }) : null),
);
