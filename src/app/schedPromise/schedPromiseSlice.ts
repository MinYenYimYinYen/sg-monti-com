import { SchedPromise } from "@/app/schedPromise/SchedPromiseTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SchedPromiseContract } from "@/app/schedPromise/api/SchedPromiseContract";
import { AppState } from "@/store";

type SchedPromiseState = {
  schedPromises: SchedPromise[];
};

const initialState: SchedPromiseState = {
  schedPromises: [],
};

const schedPromiseSlice = createSlice({
  name: "schedPromise",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getSchedPromises.fulfilled, (state, action) => {
      // Create a Set of existing entity keys: "service:123", "program:456", "customer:789"
      const existingKeys = new Set(
        state.schedPromises.map(p => `${p.entityType}:${p.entityId}`)
      );

      // Filter out duplicates - cast payload as SchedPromise array
      const promises = action.payload as SchedPromise[];
      const newPromises = promises.filter(
        p => !existingKeys.has(`${p.entityType}:${p.entityId}`)
      );

      state.schedPromises.push(...newPromises);
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

    // Create Sets for each entity type to track what's already loaded
    const existingServices = new Set(
      existingPromises
        .filter(p => p.entityType === "service")
        .map(p => p.entityId)
    );
    const existingPrograms = new Set(
      existingPromises
        .filter(p => p.entityType === "program")
        .map(p => p.entityId)
    );
    const existingCustomers = new Set(
      existingPromises
        .filter(p => p.entityType === "customer")
        .map(p => p.entityId)
    );

    // Filter out already-fetched IDs for each array
    // Also remove undefined values for consistent hashing
    const transformed: {
      serviceIds?: number[];
      programIds?: number[];
      customerIds?: number[];
    } = {};

    if (params.serviceIds?.length) {
      const filtered = params.serviceIds.filter(id => !existingServices.has(id));
      if (filtered.length > 0) transformed.serviceIds = filtered;
    }
    if (params.programIds?.length) {
      const filtered = params.programIds.filter(id => !existingPrograms.has(id));
      if (filtered.length > 0) transformed.programIds = filtered;
    }
    if (params.customerIds?.length) {
      const filtered = params.customerIds.filter(id => !existingCustomers.has(id));
      if (filtered.length > 0) transformed.customerIds = filtered;
    }

    return transformed;
  },
  customCondition: (arg, api) => {
    const params = arg.__transformedParams ?? arg.params;
    
    // Only dispatch if at least one array has IDs
    const hasServiceIds = (params.serviceIds?.length ?? 0) > 0;
    const hasProgramIds = (params.programIds?.length ?? 0) > 0;
    const hasCustomerIds = (params.customerIds?.length ?? 0) > 0;
    
    return hasServiceIds || hasProgramIds || hasCustomerIds;
  },
});

export const schedPromiseReducer = schedPromiseSlice.reducer;
export const schedPromiseActions = {
  ...schedPromiseSlice.actions,
  getSchedPromises,
};
