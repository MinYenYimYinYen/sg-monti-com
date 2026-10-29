import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Progress of a PDF save run. The tab freezes while rendering, so this is what the UI shows. */
export type PdfRunStatus = {
  state: "idle" | "running";
  /** File being rendered right now. Empty when idle. */
  currentFileName: string;
  savedCount: number;
  totalCount: number;
};

export const IDLE_PDF_STATUS: PdfRunStatus = {
  state: "idle",
  currentFileName: "",
  savedCount: 0,
  totalCount: 0,
};

type RenewalLettersState = {
  pdfStatus: PdfRunStatus;
  /** Lives here, not in component state, so the choice survives switching tabs. */
  selectedTemplateId: string | null;
  /**
   * The season the customers in the renewal context were loaded for. The config's season
   * can change after loading, so staleness is derived by comparing the two. Null until the
   * first load.
   */
  loadedSeason: number | null;
  /**
   * Each inner list is the batchKeys of sibling batches joined into one row. Keys that no
   * longer exist after a reload are ignored by the selectors, so nothing needs cleaning up.
   */
  combinedGroups: string[][];
  /** Rows ticked in the table. A combined row is identified by its first member's key. */
  checkedRowIds: string[];
};

const initialState: RenewalLettersState = {
  pdfStatus: IDLE_PDF_STATUS,
  selectedTemplateId: null,
  loadedSeason: null,
  combinedGroups: [],
  checkedRowIds: [],
};

const renewalLettersSlice = createSlice({
  name: "renewalLetters",
  initialState,
  reducers: {
    setSelectedTemplateId: (state, action: PayloadAction<string | null>) => {
      state.selectedTemplateId = action.payload;
    },
    setPdfStatus: (state, action: PayloadAction<PdfRunStatus>) => {
      state.pdfStatus = action.payload;
    },
    resetPdfStatus: (state) => {
      state.pdfStatus = IDLE_PDF_STATUS;
    },
    setLoadedSeason: (state, action: PayloadAction<number | null>) => {
      state.loadedSeason = action.payload;
    },
    toggleCheckedRow: (state, action: PayloadAction<string>) => {
      const rowId = action.payload;
      const current = state.checkedRowIds ?? [];
      state.checkedRowIds = current.includes(rowId)
        ? current.filter((checkedId) => checkedId !== rowId)
        : [...current, rowId];
    },
    /** Replaces any existing group that overlaps the new one, so groups never share a batch. */
    combineBatches: (state, action: PayloadAction<{ memberKeys: string[] }>) => {
      const { memberKeys } = action.payload;
      const merging = new Set(memberKeys);
      const remaining = (state.combinedGroups ?? []).filter(
        (group) => !group.some((key) => merging.has(key)),
      );
      state.combinedGroups = [...remaining, memberKeys];
      state.checkedRowIds = [];
    },
    /** Removes every group that contains one of the given row ids. */
    splitBatches: (state, action: PayloadAction<{ rowIds: string[] }>) => {
      const splitting = new Set(action.payload.rowIds);
      state.combinedGroups = (state.combinedGroups ?? []).filter(
        (group) => !group.some((key) => splitting.has(key)),
      );
      state.checkedRowIds = [];
    },
  },
});

export const renewalLettersReducer = renewalLettersSlice.reducer;
export const renewalLettersActions = renewalLettersSlice.actions;
