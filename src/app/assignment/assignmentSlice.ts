import { createSlice } from "@reduxjs/toolkit";
import { ServiceAssignmentDoc, AssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AppState } from "@/store";

type AssignmentState = {
  /** ServiceAssignmentDoc[] — one entry per service, with full assignment history. */
  docs: ServiceAssignmentDoc[];
  availableDates: string[];
};

const initialState: AssignmentState = {
  docs: [],
  availableDates: [],
};

// Merges incoming ServiceAssignmentDoc[] into the existing docs array, upserting by servId.
function upsertDocs(
  existing: ServiceAssignmentDoc[],
  incoming: ServiceAssignmentDoc[],
): ServiceAssignmentDoc[] {
  if (incoming.length === 0) return existing;
  const map = new Map(existing.map((d) => [d.servId, d]));
  for (const doc of incoming) {
    map.set(doc.servId, doc);
  }
  return Array.from(map.values());
}

const getByServIds = createStandardThunk<AssignmentContract, "getByServIds">({
  typePrefix: "assignment/getByServIds",
  apiPath: "/assignment/api",
  opName: "getByServIds",
  // Filter out already-loaded servIds before hashing — prevents duplicate API calls
  // when streaming servIds arrive incrementally.
  transformParams: (params, getState) => {
    const state = getState() as AppState;
    const loadedServIds = new Set(state.assignment.docs.map((d) => d.servId));
    const unloaded = params.servIds.filter((id) => !loadedServIds.has(id));
    return { servIds: unloaded };
  },
});

const getBySchedDate = createStandardThunk<AssignmentContract, "getBySchedDate">({
  typePrefix: "assignment/getBySchedDate",
  apiPath: "/assignment/api",
  opName: "getBySchedDate",
});

const getAvailableDates = createStandardThunk<AssignmentContract, "getAvailableDates">({
  typePrefix: "assignment/getAvailableDates",
  apiPath: "/assignment/api",
  opName: "getAvailableDates",
});

const getBySchedDateRange = createStandardThunk<AssignmentContract, "getBySchedDateRange">({
  typePrefix: "assignment/getBySchedDateRange",
  apiPath: "/assignment/api",
  opName: "getBySchedDateRange",
});

const saveAssignments = createStandardThunk<AssignmentContract, "saveAssignments">({
  typePrefix: "assignment/saveAssignments",
  apiPath: "/assignment/api",
  opName: "saveAssignments",
});

const assignmentSlice = createSlice({
  name: "assignment",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getByServIds.fulfilled, (state, action) => {
      state.docs = upsertDocs(state.docs, action.payload);
    });
    builder.addCase(getBySchedDate.fulfilled, (state, action) => {
      state.docs = upsertDocs(state.docs, action.payload);
    });
    builder.addCase(getBySchedDateRange.fulfilled, (state, action) => {
      state.docs = upsertDocs(state.docs, action.payload);
    });
    builder.addCase(getAvailableDates.fulfilled, (state, action) => {
      state.availableDates = action.payload;
    });
    // saveAssignments returns AssignmentDoc[] (the saved entries), not ServiceAssignmentDoc[].
    // We don't update docs here — the next getByServIds call will pick up the new state.
    // The optimistic update for lastAssigned is handled by the CSV upload flow.
  },
});

export default assignmentSlice.reducer;
export const assignmentActions = {
  ...assignmentSlice.actions,
  getByServIds,
  getBySchedDate,
  getAvailableDates,
  getBySchedDateRange,
  saveAssignments,
};
