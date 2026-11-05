import { createSelector } from "@reduxjs/toolkit";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import {
  buildConfirmedKeySet,
  findUnconfirmedRowIds,
} from "@/app/qbo/importCCTxn/_lib/importConfirmUtils";

// Which descriptions a person has confirmed, read from the mappings in state. Every component
// that shows a confirmation reads these, so confirming a description once updates every place
// that shows it.

/** Every confirmed description, as confirmationKey strings. */
const selectConfirmedKeys = createSelector(
  [importCCTxnMappingSelect.merchantMappings],
  (merchantMappings) =>
    buildConfirmedKeySet(merchantMappings.filter((mapping) => mapping.ownerUserName === null)),
);

/** Rows that can still be posted, have a mapping pre-filled, and whose description is not confirmed. */
const selectUnconfirmedRowIds = createSelector(
  [
    importRowSelect.postableRows,
    importCCTxnMappingSelect.merchantMappingMap,
    selectConfirmedKeys,
  ],
  (postableRows, mappingMap, confirmedKeys) =>
    new Set(findUnconfirmedRowIds({ rows: postableRows, mappingMap, confirmedKeys })),
);

export const importConfirmSelect = {
  confirmedKeys: selectConfirmedKeys,
  unconfirmedRowIds: selectUnconfirmedRowIds,
};
