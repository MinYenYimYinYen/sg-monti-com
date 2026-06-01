import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GenLedgerAccountEntry, GenLedgerFile, JavelinState } from "@/app/javelin/JavelinTypes";

function buildDefaultPrefix(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `SAGL ${yy}${mm}${dd}-`;
}

const initialState: JavelinState = {
  files: [],
  journalNoPrefix: buildDefaultPrefix(),
  savedAccountMap: {},
  liveAccountMap: {},
};

const javelinSlice = createSlice({
  name: "javelin",
  initialState,
  reducers: {
    setFiles(state, action: PayloadAction<GenLedgerFile[]>) {
      state.files = action.payload;
    },
    setJournalNoPrefix(state, action: PayloadAction<string>) {
      state.journalNoPrefix = action.payload;
    },
    setLiveAccountEntry(
      state,
      action: PayloadAction<{ crmName: string; entry: GenLedgerAccountEntry }>,
    ) {
      state.liveAccountMap[action.payload.crmName] = action.payload.entry;
    },
    initAccountMap(
      state,
      action: PayloadAction<Record<string, GenLedgerAccountEntry>>,
    ) {
      state.savedAccountMap = action.payload;
      state.liveAccountMap = action.payload;
    },
    syncSavedAccountMap(
      state,
      action: PayloadAction<Record<string, GenLedgerAccountEntry>>,
    ) {
      state.savedAccountMap = action.payload;
    },
  },
});

export const javelinActions = javelinSlice.actions;

const javelinReducer = javelinSlice.reducer;
export default javelinReducer;
