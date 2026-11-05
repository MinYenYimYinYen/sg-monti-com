import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ImportDecisionContract } from "@/app/qbo/importCCTxn/decisions/api/ImportDecisionContract";
import {
  DecisionDraft,
  DecisionFailure,
} from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";
import {
  clearSavedFromDraft,
  emptyDraft,
  pickAccountInDraft,
  pickVendorInDraft,
  setAlwaysSkipInDraft,
  setRowConfirmedInDraft,
  setRowSkippedInDraft,
} from "@/app/qbo/importCCTxn/_lib/importDecisionDraftUtils";

const API_PATH = "/qbo/importCCTxn/decisions/api";

// Not deduplicated on purpose: a save writes, and the draft it sends is the user's latest.
const saveDecisions = createStandardThunk<ImportDecisionContract, "saveDecisions">({
  typePrefix: "importDecision/saveDecisions",
  apiPath: API_PATH,
  opName: "saveDecisions",
});

export type ImportDecisionSaveStatus = "idle" | "pending" | "success" | "error";

type ImportDecisionState = {
  draft: DecisionDraft;
  saveStatus: ImportDecisionSaveStatus;
  /** Parts of the last save that were refused. Their decisions stay in the draft. */
  saveFailures: DecisionFailure[];
};

const initialState: ImportDecisionState = {
  draft: emptyDraft,
  saveStatus: "idle",
  saveFailures: [],
};

const importDecisionSlice = createSlice({
  name: "importDecision",
  initialState,
  reducers: {
    pickVendor(
      state,
      action: PayloadAction<{
        rowId: string;
        merchantKey: string;
        vendorId: string;
        storedVendorId: string | null;
      }>,
    ) {
      state.draft = pickVendorInDraft({ draft: state.draft, ...action.payload });
      state.saveStatus = "idle";
    },
    pickAccount(
      state,
      action: PayloadAction<{ rowId: string; merchantKey: string; accountId: string }>,
    ) {
      state.draft = pickAccountInDraft({ draft: state.draft, ...action.payload });
      state.saveStatus = "idle";
    },
    setRowSkipped(state, action: PayloadAction<{ rowId: string; isSkipped: boolean }>) {
      state.draft = setRowSkippedInDraft({ draft: state.draft, ...action.payload });
      state.saveStatus = "idle";
    },
    setAlwaysSkip(state, action: PayloadAction<{ merchantKey: string; isAlwaysSkip: boolean }>) {
      state.draft = setAlwaysSkipInDraft({ draft: state.draft, ...action.payload });
      state.saveStatus = "idle";
    },
    setRowConfirmed(
      state,
      action: PayloadAction<{
        rowId: string;
        merchantKey: string;
        vendorId: string;
        isConfirmed: boolean;
      }>,
    ) {
      state.draft = setRowConfirmedInDraft({ draft: state.draft, ...action.payload });
      state.saveStatus = "idle";
    },
    discardDraft(state) {
      state.draft = emptyDraft;
      state.saveFailures = [];
      state.saveStatus = "idle";
    },
    resetSaveStatus(state) {
      state.saveStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(saveDecisions.pending, (state) => {
      state.saveStatus = "pending";
      state.saveFailures = [];
    });
    builder.addCase(saveDecisions.fulfilled, (state, action) => {
      const { failures } = action.payload;
      state.draft = clearSavedFromDraft({ draft: state.draft, failures });
      state.saveFailures = failures;
      state.saveStatus = failures.length === 0 ? "success" : "error";
    });
    builder.addCase(saveDecisions.rejected, (state) => {
      state.saveStatus = "error";
    });
  },
});

export const importDecisionActions = {
  ...importDecisionSlice.actions,
  saveDecisions,
};
export const importDecisionReducer = importDecisionSlice.reducer;
