import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { RouteNoteContract } from "@/app/routeNotes/api/RouteNoteContract";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { AppState } from "@/store";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type RouteNoteState = {
  docs: RouteNote[];
  /**
   * Date ranges that have already been fetched.
   * Used by transformParams to avoid re-fetching already-loaded ranges.
   */
  loadedRanges: Array<{ min: string; max: string }>;
};

const initialState: RouteNoteState = {
  docs: [],
  loadedRanges: [],
};

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

const getByDateRange = createStandardThunk<RouteNoteContract, "getByDateRange">({
  typePrefix: "routeNotes/getByDateRange",
  apiPath: "/routeNotes/api",
  opName: "getByDateRange",
  customCondition: (arg, { getState }) => {
    const state = getState() as AppState;
    const { loadedRanges } = state.routeNotes;
    const params = arg.params;
    // Cancel if the requested range is fully covered by any already-loaded range.
    return !loadedRanges.some(
      (r) => r.min <= params.minDate && r.max >= params.maxDate,
    );
  },
});

const upsert = createStandardThunk<RouteNoteContract, "upsert">({
  typePrefix: "routeNotes/upsert",
  apiPath: "/routeNotes/api",
  opName: "upsert",
});

const deleteOne = createStandardThunk<RouteNoteContract, "deleteOne">({
  typePrefix: "routeNotes/deleteOne",
  apiPath: "/routeNotes/api",
  opName: "deleteOne",
});

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const routeNoteSlice = createSlice({
  name: "routeNotes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getByDateRange.fulfilled, (state, action) => {
      const incoming = action.payload as RouteNote[];
      // Merge: upsert by routeNoteId
      for (const note of incoming) {
        const idx = state.docs.findIndex((d) => d.routeNoteId === note.routeNoteId);
        if (idx !== -1) {
          state.docs[idx] = note;
        } else {
          state.docs.push(note);
        }
      }
      // Record the loaded range
      const { minDate, maxDate } = action.meta.arg.params as { minDate: string; maxDate: string };
      state.loadedRanges.push({ min: minDate, max: maxDate });
    });

    builder.addCase(upsert.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex((d) => d.routeNoteId === updated.routeNoteId);
      if (idx !== -1) {
        state.docs[idx] = updated;
      } else {
        state.docs.push(updated);
      }
    });

    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deleted = action.payload;
      state.docs = state.docs.filter((d) => d.routeNoteId !== deleted.routeNoteId);
    });
  },
});

export const routeNoteActions = {
  getByDateRange,
  upsert,
  deleteOne,
};

export const routeNoteReducer = routeNoteSlice.reducer;
