import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import type { UpsellPrioritiesContract } from "./upsellPrioritiesContract";
import type {
  UpsellPrioritiesDoc,
  UpsellPrioritiesDraft,
  UpsellPriorityDoc,
} from "./upsellPrioritiesTypes";

type UpsellPrioritiesState = {
  docs: UpsellPrioritiesDoc[];
  /** The list currently open in the editor. null = nothing open. */
  draft: UpsellPrioritiesDraft | null;
};

const initialState: UpsellPrioritiesState = {
  docs: [],
  draft: null,
};

const API_PATH = "/prepayLetters/upsellPriorities/api";

const getUpsellPriorities = createStandardThunk<UpsellPrioritiesContract, "getUpsellPriorities">({
  typePrefix: "upsellPriorities/getUpsellPriorities",
  apiPath: API_PATH,
  opName: "getUpsellPriorities",
});

const saveUpsellPriorities = createStandardThunk<UpsellPrioritiesContract, "saveUpsellPriorities">({
  typePrefix: "upsellPriorities/saveUpsellPriorities",
  apiPath: API_PATH,
  opName: "saveUpsellPriorities",
});

const deleteUpsellPriorities = createStandardThunk<UpsellPrioritiesContract, "deleteUpsellPriorities">({
  typePrefix: "upsellPriorities/deleteUpsellPriorities",
  apiPath: API_PATH,
  opName: "deleteUpsellPriorities",
});

const upsellPrioritiesSlice = createSlice({
  name: "upsellPriorities",
  initialState,
  reducers: {
    setDraft: (state, action: PayloadAction<UpsellPrioritiesDraft>) => {
      state.draft = action.payload;
    },
    clearDraft: (state) => {
      state.draft = null;
    },
    /** Appends a candidate at the lowest priority. Ignores progCodes already listed. */
    addPriority: (state, action: PayloadAction<{ progCodeId: string }>) => {
      if (!state.draft) return;
      const { progCodeId } = action.payload;
      if (state.draft.priorities.some((p) => p.progCodeId === progCodeId)) return;
      state.draft.priorities.push({ progCodeId, precludedBy: [] });
    },
    removePriority: (state, action: PayloadAction<{ progCodeId: string }>) => {
      if (!state.draft) return;
      state.draft.priorities = state.draft.priorities.filter(
        (p) => p.progCodeId !== action.payload.progCodeId,
      );
    },
    /** Replaces the whole ordered list (used by drag reorder). */
    reorderPriorities: (state, action: PayloadAction<{ priorities: UpsellPriorityDoc[] }>) => {
      if (!state.draft) return;
      state.draft.priorities = action.payload.priorities;
    },
    setPrecludedBy: (
      state,
      action: PayloadAction<{ progCodeId: string; precludedBy: string[] }>,
    ) => {
      if (!state.draft) return;
      const { progCodeId, precludedBy } = action.payload;
      const priority = state.draft.priorities.find((p) => p.progCodeId === progCodeId);
      if (priority) priority.precludedBy = precludedBy;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getUpsellPriorities.fulfilled, (state, action) => {
      state.docs = action.payload;
    });

    builder.addCase(saveUpsellPriorities.fulfilled, (state, action) => {
      const saved = action.payload;
      const idx = state.docs.findIndex((d) => d.upsellPrioritiesId === saved.upsellPrioritiesId);
      if (idx !== -1) {
        state.docs[idx] = saved;
      } else {
        state.docs.push(saved);
      }
      // Makes the saved doc the active entity, clearing dirty state and switching to a Save As copy.
      state.draft = saved;
    });

    builder.addCase(deleteUpsellPriorities.fulfilled, (state, action) => {
      const { upsellPrioritiesId } = action.meta.arg.params;
      state.docs = state.docs.filter((d) => d.upsellPrioritiesId !== upsellPrioritiesId);
    });
  },
});

export const upsellPrioritiesReducer = upsellPrioritiesSlice.reducer;
export const upsellPrioritiesActions = {
  ...upsellPrioritiesSlice.actions,
  getUpsellPriorities,
  saveUpsellPriorities,
  deleteUpsellPriorities,
};
