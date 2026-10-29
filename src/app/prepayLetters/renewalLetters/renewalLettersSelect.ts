import { createSelector } from "@reduxjs/toolkit";
import type { AppState } from "@/store";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { companySelect } from "@/app/realGreen/company/companySlice";
import { prepayConfigSelect } from "@/app/prepayLetters/config/prepayConfigSelect";
import { upsellPrioritiesSelect } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesSelect";
import { formTemplateSelect } from "@/app/formTemplate/formTemplateSelect";
import {
  buildRenewalBatches,
  sortCustomersByCustId,
  type RenewalBatchesResult,
} from "./renewalLettersLogic";
import { IDLE_PDF_STATUS, type PdfRunStatus } from "./renewalLettersSlice";
import {
  buildDisplayBatches,
  canCombineRows,
  getCombineMemberKeys,
  getDisabledRowIds,
  type DisplayBatch,
} from "./renewalBatchCombining";

/** Registry key of the form data type that PrepayLetterData templates are saved under. */
export const PREPAY_LETTER_DATA_TYPE = "PrepayLetter";

const selectSelectedTemplateId = (state: AppState) => state.renewalLetters.selectedTemplateId;

/** Only templates that consume PrepayLetterData can render these letters. */
const selectPrepayLetterTemplates = createSelector(
  [formTemplateSelect.templatesWithDisplayName],
  (templates) => templates.filter((template) => template.dataType === PREPAY_LETTER_DATA_TYPE),
);

/** Null until the selected template exists in the loaded list (it may have been deleted). */
const selectSelectedTemplate = createSelector(
  [selectPrepayLetterTemplates, selectSelectedTemplateId],
  (templates, templateId) =>
    templates.find((template) => template.templateId === templateId) ?? null,
);

/**
 * First selector in the chain. Every batch inherits this order because each waterfall split
 * keeps it. Still subject to the nav bar flag filter (centralSelect.customers applies it).
 */
const selectCustomersByCustId = createSelector([centralSelect.customers], sortCustomersByCustId);

/**
 * Null when the batches cannot be built: no open config (the letters need one) or no company.
 * Uses `parsedDraft` so mentions are plain text; the raw config HTML must never reach a letter.
 */
const selectBatches = createSelector(
  [
    selectCustomersByCustId,
    upsellPrioritiesSelect.priorities,
    prepayConfigSelect.parsedDraft,
    companySelect.company,
  ],
  (customers, priorities, config, company): RenewalBatchesResult | null => {
    if (!config || !company) return null;
    return buildRenewalBatches({ customers, priorities, config, company });
  },
);

const selectLoadedSeason = (state: AppState) => state.renewalLetters.loadedSeason;

// Falls back for state created before the field existed (hot reload).
const selectPdfStatus = (state: AppState): PdfRunStatus =>
  state.renewalLetters.pdfStatus ?? IDLE_PDF_STATUS;
const selectIsPdfRunning = (state: AppState) => selectPdfStatus(state).state === "running";

// Stable empty arrays: `?? []` inline would be a new reference every call and defeat memoization.
// The fallback also covers state created before these fields existed (hot reload).
const EMPTY_KEYS: string[] = [];
const EMPTY_GROUPS: string[][] = [];

const selectCombinedGroups = (state: AppState) =>
  state.renewalLetters.combinedGroups ?? EMPTY_GROUPS;
const selectCheckedRowIds = (state: AppState) =>
  state.renewalLetters.checkedRowIds ?? EMPTY_KEYS;

/** The rows the table shows: waterfall batches with the user's combined groups applied. */
const selectDisplayBatches = createSelector(
  [selectBatches, selectCombinedGroups],
  (result, combinedGroups): DisplayBatch[] =>
    result ? buildDisplayBatches({ batches: result.batches, combinedGroups }) : [],
);

/** Checked ids filtered to rows that still exist, so a reload quietly drops stale ticks. */
const selectCheckedRows = createSelector(
  [selectDisplayBatches, selectCheckedRowIds],
  (rows, checkedRowIds) => rows.filter((row) => checkedRowIds.includes(row.rowId)),
);

const selectDisabledRowIds = createSelector(
  [selectDisplayBatches, selectCheckedRows],
  (rows, checkedRows) =>
    getDisabledRowIds({ rows, checkedRowIds: checkedRows.map((row) => row.rowId) }),
);

const selectCanCombine = createSelector([selectCheckedRows], (checkedRows) =>
  canCombineRows(checkedRows),
);

const selectCanSplit = createSelector([selectCheckedRows], (checkedRows) =>
  checkedRows.some((row) => row.isCombined),
);

/** Member keys a Combine click would join, in table order. */
const selectCombineMemberKeys = createSelector(
  [selectBatches, selectCheckedRows],
  (result, checkedRows) =>
    result ? getCombineMemberKeys({ checkedRows, batches: result.batches }) : EMPTY_KEYS,
);

/**
 * Unfiltered on purpose: the nav bar flag filter can hide every customer, which must not
 * read as "nothing loaded".
 */
const selectHasLoadedCustomers = createSelector(
  [centralSelect.customerDocs],
  (customerDocs) => customerDocs.length > 0,
);

/**
 * True when customers are loaded for a different season than the open config's. Derived,
 * not synced, so it is correct on the same render the config changes. Never true with no
 * customers loaded. `typeof` (not `!== null`) also covers state created before the field existed.
 */
const selectIsSeasonStale = createSelector(
  [selectLoadedSeason, prepayConfigSelect.draft, selectHasLoadedCustomers],
  (loadedSeason, config, hasLoadedCustomers) =>
    hasLoadedCustomers &&
    typeof loadedSeason === "number" &&
    config !== null &&
    loadedSeason !== config.season,
);

export const renewalLettersSelect = {
  pdfStatus: selectPdfStatus,
  isPdfRunning: selectIsPdfRunning,
  hasLoadedCustomers: selectHasLoadedCustomers,
  loadedSeason: selectLoadedSeason,
  displayBatches: selectDisplayBatches,
  checkedRows: selectCheckedRows,
  disabledRowIds: selectDisabledRowIds,
  canCombine: selectCanCombine,
  canSplit: selectCanSplit,
  combineMemberKeys: selectCombineMemberKeys,
  isSeasonStale: selectIsSeasonStale,
  selectedTemplateId: selectSelectedTemplateId,
  selectedTemplate: selectSelectedTemplate,
  prepayLetterTemplates: selectPrepayLetterTemplates,
  batches: selectBatches,
};
