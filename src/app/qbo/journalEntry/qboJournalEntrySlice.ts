import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboJournalEntryContract } from "@/app/qbo/journalEntry/api/QboJournalEntryContract";
import {
  JournalEntryPosting,
  JournalEntryRange,
  PostJournalEntriesResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { mergePostings } from "@/app/qbo/journalEntry/_lib/qboJournalEntryStateUtils";

// Journal entry postings are our own records of what we sent to QuickBooks. The server is the
// source of truth: a post or a reconcile returns the settled postings, and they are merged in by
// DocNumber. None of these thunks has a staleTime or force, so the standard rule applies: a second
// dispatch while one is running is ignored. That is what we want for a write.
const postQboJournalEntries = createStandardThunk<QboJournalEntryContract, "postMany">({
  typePrefix: "qboJournalEntry/postMany",
  apiPath: "/qbo/journalEntry/api",
  opName: "postMany",
});

const reconcileQboJournalEntries = createStandardThunk<QboJournalEntryContract, "reconcile">({
  typePrefix: "qboJournalEntry/reconcile",
  apiPath: "/qbo/journalEntry/api",
  opName: "reconcile",
});

const getQboJournalEntryPostings = createStandardThunk<QboJournalEntryContract, "getByDateRange">({
  typePrefix: "qboJournalEntry/getByDateRange",
  apiPath: "/qbo/journalEntry/api",
  opName: "getByDateRange",
});

type QboJournalEntryState = {
  journalEntryPostings: JournalEntryPosting[];
  /** The range the held postings were loaded for. Null until the first load. */
  loadedRange: JournalEntryRange | null;
  /** The answer to the last post request, so the screen can show blocked and not-sent entries. */
  lastPostRun: PostJournalEntriesResult | null;
};

const initialState: QboJournalEntryState = {
  journalEntryPostings: [],
  loadedRange: null,
  lastPostRun: null,
};

const qboJournalEntrySlice = createSlice({
  name: "qboJournalEntry",
  initialState,
  reducers: {
    clearLastPostRun: (state) => {
      state.lastPostRun = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(postQboJournalEntries.fulfilled, (state, action) => {
      state.lastPostRun = action.payload;
      state.journalEntryPostings = mergePostings({
        held: state.journalEntryPostings,
        incoming: action.payload.results.map((result) => result.posting),
      });
    });
    builder.addCase(reconcileQboJournalEntries.fulfilled, (state, action) => {
      state.journalEntryPostings = mergePostings({
        held: state.journalEntryPostings,
        incoming: action.payload.results.map((result) => result.posting),
      });
    });
    builder.addCase(getQboJournalEntryPostings.fulfilled, (state, action) => {
      state.journalEntryPostings = action.payload;
      state.loadedRange = action.meta.arg.params;
    });
  },
});

export const qboJournalEntryActions = {
  ...qboJournalEntrySlice.actions,
  postQboJournalEntries,
  reconcileQboJournalEntries,
  getQboJournalEntryPostings,
};
export const qboJournalEntryReducer = qboJournalEntrySlice.reducer;
