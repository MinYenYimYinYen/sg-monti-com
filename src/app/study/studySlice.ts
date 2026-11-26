import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import type { StudyContract } from "@/app/study/api/StudyContract";
import type { StudyDeckDoc, StudyImportDoc } from "@/app/study/StudyTypes";
import {
  IDLE_IMPORT_RUN,
  replaceDeckImports,
  upsertImportDoc,
  type ImportRunState,
} from "@/app/study/studyImportLogic";

type StudyState = {
  deckDocs: StudyDeckDoc[];
  importDocs: StudyImportDoc[];
  importRun: ImportRunState;
};

const initialState: StudyState = {
  deckDocs: [],
  importDocs: [],
  importRun: IDLE_IMPORT_RUN,
};

const API_PATH = "/study/api";

export const getDecks = createStandardThunk<StudyContract, "getDecks">({
  typePrefix: "study/getDecks",
  apiPath: API_PATH,
  opName: "getDecks",
});

export const getImports = createStandardThunk<StudyContract, "getImports">({
  typePrefix: "study/getImports",
  apiPath: API_PATH,
  opName: "getImports",
});

export const createDeck = createStandardThunk<StudyContract, "createDeck">({
  typePrefix: "study/createDeck",
  apiPath: API_PATH,
  opName: "createDeck",
});

// `planImport` and `generateCards` are not thunks from the factory: a section's PDF is about 4 MB,
// and the factory would put it in the action's `meta.arg`, where devtools and the dedup hash would
// hold it. They are called through `studyClient.ts` by the plain thunk in `studyImportThunks.ts`.

const studySlice = createSlice({
  name: "study",
  initialState,
  reducers: {
    /** A plan was saved or a section finished, so the import with its new status replaces the old one. */
    importUpdated: (state, action: PayloadAction<StudyImportDoc>) => {
      state.importDocs = upsertImportDoc({ importDocs: state.importDocs, updated: action.payload });
    },
    runStarted: (state, action: PayloadAction<{ status: "planning" | "running"; importId: string | null }>) => {
      state.importRun = { ...IDLE_IMPORT_RUN, ...action.payload };
    },
    runPlanned: (state, action: PayloadAction<{ importId: string }>) => {
      state.importRun = { ...state.importRun, status: "running", importId: action.payload.importId };
    },
    runProgressed: (state, action: PayloadAction<{ currentChunkIndex: number | null }>) => {
      state.importRun.currentChunkIndex = action.payload.currentChunkIndex;
    },
    stopRequested: (state) => {
      if (state.importRun.status !== "idle") state.importRun.stopRequested = true;
    },
    runFinished: (state, action: PayloadAction<{ message: string }>) => {
      state.importRun = { ...IDLE_IMPORT_RUN, importId: state.importRun.importId, message: action.payload.message };
    },
    runMessageCleared: (state) => {
      if (state.importRun.status === "idle") state.importRun = IDLE_IMPORT_RUN;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getDecks.fulfilled, (state, action) => {
      state.deckDocs = action.payload;
    });
    builder.addCase(getImports.fulfilled, (state, action) => {
      state.importDocs = replaceDeckImports({
        importDocs: state.importDocs,
        deckKey: action.meta.arg.params.deckKey,
        incoming: action.payload,
      });
    });
    builder.addCase(createDeck.fulfilled, (state, action) => {
      state.deckDocs = [action.payload, ...state.deckDocs];
    });
  },
});

export const studyActions = {
  ...studySlice.actions,
  getDecks,
  getImports,
  createDeck,
};

export const studyReducer = studySlice.reducer;
