import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { prepaySelect } from "@/app/realGreen/prepay/selectors/prepaySelect";
import { computeProgChooserPricing } from "./progChooserPricing";
import type { ProgChooser, QSProgramVariables } from "@/app/quickSend/QuickSendTypes";

// ---------------------------------------------------------------------------
// Base selectors — read directly from AppState to avoid circular imports with
// quickSendSelect.ts. quickSendSelect imports progChooserSelect, so
// progChooserSelect must NOT import quickSendSelect.
// ---------------------------------------------------------------------------

const selectProgChooser = (state: AppState): ProgChooser => state.quickSend.progChooser;

const selectSizeOverride = (state: AppState): string => state.quickSend.customer.sizeOverride;

const selectEffectiveTaxRate = createSelector(
  [(state: AppState) => state.quickSend.customer, zipCodeSelect.zipCodeMap],
  (customerState, zipCodeMap): number | null => {
    if (customerState.taxRateZipOverride != null) {
      return zipCodeMap.get(customerState.taxRateZipOverride)?.taxRate ?? null;
    }
    return customerState.customer?.taxRate ?? null;
  },
);

// ---------------------------------------------------------------------------
// ProgChooser-specific selectors
// ---------------------------------------------------------------------------

const selectSelectedProgCodeIds = createSelector(
  [selectProgChooser],
  (progChooser): string[] => progChooser.selectedProgCodeIds,
);

const selectServCodeOverrides = createSelector(
  [selectProgChooser],
  (progChooser): Record<string, string[]> => progChooser.servCodeOverrides,
);

const selectPriceOverrides = createSelector(
  [selectProgChooser],
  (progChooser): Record<string, number> => progChooser.priceOverrides,
);

const selectPrepayId = createSelector(
  [selectProgChooser],
  (progChooser): string | null => progChooser.prepayId,
);

/**
 * Computes resolved QSProgramVariables for all selected programs using
 * computeProgChooserPricing. This is the authoritative pricing selector for
 * the progChooser loop — quickSendSelect.ts consumes this instead of computing
 * vars inline.
 */
const selectProgVars = createSelector(
  [
    selectSelectedProgCodeIds,
    selectServCodeOverrides,
    selectPriceOverrides,
    selectPrepayId,
    prepaySelect.prepayDocMap,
    progServSelect.progCodeMap,
    selectSizeOverride,
    selectEffectiveTaxRate,
  ],
  (selectedProgCodeIds, servCodeOverrides, priceOverrides, prepayId, prepayDocMap, progCodeMap, sizeOverride, effectiveTaxRate): QSProgramVariables[] => {
    const size = parseFloat(sizeOverride);
    const prepayPercent = prepayId != null ? (prepayDocMap.get(prepayId)?.percent ?? null) : null;
    return selectedProgCodeIds.map((progCodeId: string) => {
      const progCode = progCodeMap.get(progCodeId);
      const includedServCodeIds = servCodeOverrides[progCodeId] ?? [];
      if (!progCode) {
        return {
          alias: progCodeId,
          progCodeId,
          description: progCodeId,
          servCount: includedServCodeIds.length,
          prefPrice: null,
          econPrice: null,
          servPrice: null,
          subTotal: null,
          prepayPercent,
          prepayDiscAmt: null,
          taxAmt: null,
          total: null,
          servTable: [],
        };
      }
      return computeProgChooserPricing({
        progCode,
        includedServCodeIds,
        size,
        effectiveTaxRate,
        prepayPercent,
        progPriceOverride: priceOverrides[progCodeId] ?? null,
      });
    });
  },
);

type ProgChooserAggregates = {
  subTotal: number | null;
  prepayDiscAmt: number | null;
  taxAmt: number | null;
  total: number | null;
};

/**
 * Sums the four aggregate fields across all selected programs.
 * A field is null if no programs are selected or all contributing values are null.
 */
const selectAggregates = createSelector(
  [selectProgVars],
  (progVars): ProgChooserAggregates => {
    if (progVars.length === 0) {
      return { subTotal: null, prepayDiscAmt: null, taxAmt: null, total: null };
    }

    let subTotal: number | null = null;
    let prepayDiscAmt: number | null = null;
    let taxAmt: number | null = null;
    let total: number | null = null;

    for (const vars of progVars) {
      if (vars.subTotal !== null) subTotal = (subTotal ?? 0) + vars.subTotal;
      if (vars.prepayDiscAmt !== null) prepayDiscAmt = (prepayDiscAmt ?? 0) + vars.prepayDiscAmt;
      if (vars.taxAmt !== null) taxAmt = (taxAmt ?? 0) + vars.taxAmt;
      if (vars.total !== null) total = (total ?? 0) + vars.total;
    }

    return { subTotal, prepayDiscAmt, taxAmt, total };
  },
);

export const progChooserSelect = {
  progChooser: selectProgChooser,
  selectedProgCodeIds: selectSelectedProgCodeIds,
  servCodeOverrides: selectServCodeOverrides,
  priceOverrides: selectPriceOverrides,
  prepayId: selectPrepayId,
  progVars: selectProgVars,
  aggregates: selectAggregates,
};
