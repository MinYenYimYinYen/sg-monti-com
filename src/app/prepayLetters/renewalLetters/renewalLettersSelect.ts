import { createSelector } from "@reduxjs/toolkit";
import type { AppState } from "@/store";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { companySelect } from "@/app/realGreen/company/companySlice";
import { prepayConfigSelect } from "@/app/prepayLetters/config/prepayConfigSelect";
import { upsellPrioritiesSelect } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesSelect";
import { formTemplateSelect } from "@/app/formTemplate/formTemplateSelect";
import {
  buildCustomerLetters,
  buildRenewalBatches,
  sortCustomersByCustId,
  type CustomerLetter,
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

// `?? null` covers state created before the field existed (hot reload).
const selectSelectedCustId = (state: AppState): number | null =>
  state.renewalLetters.selectedCustId ?? null;

export type CustomerLookupOption = { custId: number; displayName: string };

/**
 * Branches off the same list the batches use, and the typed text never reaches it, so
 * searching cannot narrow what can be found. Already in custId order.
 */
const selectLookupCustomers = createSelector(
  [selectCustomersByCustId],
  (customers): CustomerLookupOption[] =>
    customers.map((customer) => ({ custId: customer.custId, displayName: customer.displayName })),
);

/** Null when nothing is picked or the picked customer is no longer loaded. */
const selectSelectedCustomer = createSelector(
  [selectCustomersByCustId, selectSelectedCustId],
  (customers, custId) => customers.find((customer) => customer.custId === custId) ?? null,
);

const EMPTY_CUSTOMERS: Customer[] = [];

/**
 * The custId of the selected customer's group master: itself when it is the master, else its
 * masterAcctId. Null when it is not in a group (RealGreen leaves masterAcctId at -1).
 */
const selectSelectedGroupMasterId = createSelector([selectSelectedCustomer], (customer) => {
  if (!customer) return null;
  if (customer.isMasterAcct) return customer.custId;
  return customer.masterAcctId > 0 ? customer.masterAcctId : null;
});

/**
 * Null when the master is not loaded. A master need not have services, so it can be absent
 * from the renewal customers, and it is deliberately not fetched: it would not get a letter.
 */
const selectSelectedMasterAccount = createSelector(
  [selectCustomersByCustId, selectSelectedGroupMasterId],
  (customers, masterId) =>
    masterId === null
      ? null
      : (customers.find((customer) => customer.custId === masterId && customer.isMasterAcct) ??
        null),
);

/**
 * Every loaded member of the selected customer's group, including the selected one when it
 * is a sub-account. Empty when the customer is not in a group.
 */
const selectSelectedSubAccounts = createSelector(
  [selectCustomersByCustId, selectSelectedGroupMasterId],
  (customers, masterId) =>
    masterId === null
      ? EMPTY_CUSTOMERS
      : customers.filter((customer) => !customer.isMasterAcct && customer.masterAcctId === masterId),
);

/** Master first when loaded, then the members. Falls back to the selection alone with no group. */
const selectSelectedGroupAccounts = createSelector(
  [
    selectSelectedCustomer,
    selectSelectedMasterAccount,
    selectSelectedSubAccounts,
    selectSelectedGroupMasterId,
  ],
  (customer, master, subAccounts, masterId): Customer[] => {
    if (!customer) return EMPTY_CUSTOMERS;
    if (masterId === null) return [customer];
    return master ? [master, ...subAccounts] : subAccounts;
  },
);

/** Null under the same conditions as `selectBatches`: no open config, or no company. */
const selectSelectedCustomerLetters = createSelector(
  [
    selectSelectedGroupAccounts,
    upsellPrioritiesSelect.priorities,
    prepayConfigSelect.parsedDraft,
    companySelect.company,
  ],
  (accounts, priorities, config, company): CustomerLetter[] | null => {
    if (accounts.length === 0 || !config || !company) return null;
    return buildCustomerLetters({ accounts, priorities, config, company });
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
  selectedCustId: selectSelectedCustId,
  lookupCustomers: selectLookupCustomers,
  selectedCustomer: selectSelectedCustomer,
  selectedGroupMasterId: selectSelectedGroupMasterId,
  selectedMasterAccount: selectSelectedMasterAccount,
  selectedSubAccounts: selectSelectedSubAccounts,
  selectedCustomerLetters: selectSelectedCustomerLetters,
};
