import { SchedPromise, PromiseIssue } from "@/app/schedPromise/SchedPromiseTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SchedPromiseContract } from "@/app/schedPromise/api/SchedPromiseContract";
import { AppState } from "@/store";

type SchedPromiseState = {
  schedPromises: SchedPromise[];
  issues: PromiseIssue[];
};

const initialState: SchedPromiseState = {
  schedPromises: [],
  issues: [],
};

const schedPromiseSlice = createSlice({
  name: "schedPromise",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getSchedPromises.fulfilled, (state, action) => {
      const { promises, issues } = action.payload;

      // Deduplicate promises
      const existingPromiseKeys = new Set(
        state.schedPromises.map((p) => `${p.entityType}:${p.entityId}`)
      );
      const newPromises = promises.filter(
        (p) => !existingPromiseKeys.has(`${p.entityType}:${p.entityId}`)
      );
      state.schedPromises.push(...newPromises);

      // Deduplicate issues
      const existingIssueKeys = new Set(
        state.issues.map((i) => `${i.entityType}:${i.entityId}`)
      );
      const newIssues = issues.filter(
        (i) => !existingIssueKeys.has(`${i.entityType}:${i.entityId}`)
      );
      state.issues.push(...newIssues);
    });
  },
});

const getSchedPromises = createStandardThunk<
  SchedPromiseContract,
  "getSchedPromises"
>({
  typePrefix: "schedPromise/getSchedPromises",
  apiPath: "/schedPromise/api",
  opName: "getSchedPromises",
  transformParams: (params, getState) => {
    const state = getState() as AppState;
    const existingPromises = state.schedPromise.schedPromises;

    // Create Set of existing entity keys
    const existingKeys = new Set(
      existingPromises.map((p) => `${p.entityType}:${p.entityId}`)
    );

    // Filter out already-fetched entities
    const filteredEntities = params.entities.filter(
      (e) => !existingKeys.has(`${e.entityType}:${e.entityId}`)
    );

    return { entities: filteredEntities };
  },
  customCondition: (arg, api) => {
    const params = arg.__transformedParams ?? arg.params;

    // Only dispatch if there are entities to fetch
    return (params.entities?.length ?? 0) > 0;
  },
});

export const schedPromiseReducer = schedPromiseSlice.reducer;
export const schedPromiseActions = {
  ...schedPromiseSlice.actions,
  getSchedPromises,
};
