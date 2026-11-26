import { createSelector } from "@reduxjs/toolkit";
import type { AppState } from "@/store";
import { summarizeImport } from "@/app/study/studyImportLogic";

const selectDeckDocs = (state: AppState) => state.study.deckDocs;
const selectImportDocs = (state: AppState) => state.study.importDocs;
const selectImportRun = (state: AppState) => state.study.importRun;

const selectDecks = createSelector([selectDeckDocs], (deckDocs) =>
  [...deckDocs].sort((a, b) => a.title.localeCompare(b.title)),
);

const selectDecksByKey = createSelector([selectDeckDocs], (deckDocs) => {
  return new Map(deckDocs.map((doc) => [doc.deckKey, doc]));
});

/** Each deck's imports, newest first, so the latest one is the one offered for resuming. */
const selectImportsByDeckKey = createSelector([selectImportDocs], (importDocs) => {
  const importsByDeckKey = new Map<string, typeof importDocs>();
  for (const doc of [...importDocs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    importsByDeckKey.set(doc.deckKey, [...(importsByDeckKey.get(doc.deckKey) ?? []), doc]);
  }
  return importsByDeckKey;
});

const selectImportDocsById = createSelector([selectImportDocs], (importDocs) => {
  return new Map(importDocs.map((doc) => [doc.importId, doc]));
});

const selectImportSummariesById = createSelector([selectImportDocs], (importDocs) => {
  return new Map(importDocs.map((doc) => [doc.importId, summarizeImport(doc)]));
});

export const studySelect = {
  decks: selectDecks,
  decksByKey: selectDecksByKey,
  importRun: selectImportRun,
  importDocsById: selectImportDocsById,
  importsByDeckKey: selectImportsByDeckKey,
  importSummariesById: selectImportSummariesById,
};
