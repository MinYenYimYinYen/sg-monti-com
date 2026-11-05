import { createSelector } from "@reduxjs/toolkit";
import { ImportCsvRow } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import {
  findUnassignedCards,
  summarizeFile,
  summarizeFileCards,
} from "@/app/qbo/importCCTxn/_lib/importFileUtils";

// Page-level selectors for /qbo/importCCTxn. They merge the importer's slice with the mapping
// slice, so the page reacts to a saved card assignment without asking the server again.

const NO_ROWS: ImportCsvRow[] = [];

const selectParsedRows = createSelector([importRowSelect.file], (file) =>
  file.stage === "parsed" ? file.rows : NO_ROWS,
);

const selectFileSummary = createSelector([selectParsedRows], summarizeFile);

const selectFileCards = createSelector([selectParsedRows], summarizeFileCards);

const selectUnassignedCards = createSelector(
  [selectFileCards, importCCTxnMappingSelect.cardAssignmentMap],
  (fileCards, cardAssignmentMap) => findUnassignedCards({ fileCards, cardAssignmentMap }),
);

/** The server re-checks all of this on commit; this only decides whether to offer the button. */
const selectCanCommit = createSelector(
  [importRowSelect.preview, selectUnassignedCards],
  (preview, unassignedCards) =>
    preview !== null && preview.newCount > 0 && unassignedCards.length === 0,
);

export const importCCTxnSelect = {
  parsedRows: selectParsedRows,
  fileSummary: selectFileSummary,
  fileCards: selectFileCards,
  unassignedCards: selectUnassignedCards,
  canCommit: selectCanCommit,
};
