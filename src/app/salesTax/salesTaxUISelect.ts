import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { isSingleMonthRange } from "@/app/salesTax/_lib/salesTaxDateRange";
import { buildSalesTaxReport } from "@/app/salesTax/_lib/buildSalesTaxReport";
import {
  buildMnSalesTaxReport,
  findMismatchedTaxCodeIds,
  findUnmappedTaxCodeIds,
} from "@/app/salesTax/_lib/buildMnSalesTaxReport";
import { salesTaxMappingSelect } from "@/app/salesTax/salesTaxMapping/salesTaxMappingSelect";
import { taxCodeSelect } from "@/app/realGreen/taxCode/taxCodeSelectors";

const selectDateRange = (state: AppState) => state.salesTaxUI.dateRange;

const selectCanGetCustomers = createSelector([selectDateRange], (dateRange) =>
  isSingleMonthRange(dateRange),
);

// Built from customerMap, not centralSelect.services: that one applies the global customer-flag
// filter, which must not silently drop services from a tax number.
const selectServices = createSelector([centralSelect.customerMap], (customerMap) =>
  [...customerMap.values()].flatMap((customer) =>
    customer.programs.flatMap((program) => program.services),
  ),
);

/** The source of truth for every sales tax number on screen. Null until a month is picked. */
const selectTaxReport = createSelector(
  [selectServices, selectDateRange],
  (services, dateRange) => (dateRange ? buildSalesTaxReport({ services, dateRange }) : null),
);

/** The RealGreen report redistributed onto Minnesota tax types by the saved mappings. */
const selectMnTaxReport = createSelector(
  [selectTaxReport, salesTaxMappingSelect.docs, taxCodeSelect.taxCodeMap],
  (taxReport, mappingDocs, taxCodeMap) =>
    taxReport ? buildMnSalesTaxReport({ taxReport, mappingDocs, taxCodeMap }) : null,
);

/**
 * RealGreen tax codes this month's services use that have no mapping, so the return is incomplete.
 * Exempt codes (0% rate) are not listed: they need no Minnesota line.
 */
const selectUnmappedTaxCodeIds = createSelector(
  [selectTaxReport, salesTaxMappingSelect.docs, taxCodeSelect.taxCodeMap],
  (taxReport, mappingDocs, taxCodeMap) =>
    taxReport ? findUnmappedTaxCodeIds({ taxReport, mappingDocs, taxCodeMap }) : [],
);

/** Mapped tax codes this month uses whose Minnesota rates do not add up to the RealGreen rate. */
const selectMismatchedTaxCodeIds = createSelector(
  [selectTaxReport, salesTaxMappingSelect.rows],
  (taxReport, mappingRows) =>
    taxReport ? findMismatchedTaxCodeIds({ taxReport, mappingRows }) : [],
);

export const salesTaxUISelect = {
  dateRange: selectDateRange,
  canGetCustomers: selectCanGetCustomers,
  taxReport: selectTaxReport,
  mnTaxReport: selectMnTaxReport,
  unmappedTaxCodeIds: selectUnmappedTaxCodeIds,
  mismatchedTaxCodeIds: selectMismatchedTaxCodeIds,
};
