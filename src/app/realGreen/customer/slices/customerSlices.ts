import {
  BaseCustomerState,
  baseInitialState,
} from "@/app/realGreen/customer/slices/SliceTypes";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CustomerContract,
  StreamChunk,
} from "@/app/realGreen/customer/api/CustomerContract";
import { createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import { uiActions } from "@/store/reduxUtil/uiSlice";

export const createCustomerSlice = (sliceName: string) =>
  createSlice({
    name: sliceName,
    initialState: { ...baseInitialState } as BaseCustomerState,
    reducers: {
      receiveChunk(state, action: PayloadAction<StreamChunk>) {
        const { stepName, data } = action.payload;
        if (stepName === "customers" && data.customerDocs) {
          state.customerDocs.push(...data.customerDocs);
        } else if (stepName === "programs" && data.programDocs) {
          state.programDocs.push(...data.programDocs);
        } else if (stepName === "services" && data.serviceDocs) {
          state.serviceDocs.push(...data.serviceDocs);
        }
      },
      removeCustomer(state, action: PayloadAction<number>) {
        const custId = action.payload;
        const removedProgIds = new Set(
          state.programDocs
            .filter((p) => p.custId === custId)
            .map((p) => p.progId),
        );
        state.customerDocs = state.customerDocs.filter(
          (d) => d.custId !== custId,
        );
        state.programDocs = state.programDocs.filter(
          (p) => p.custId !== custId,
        );
        state.serviceDocs = state.serviceDocs.filter(
          (s) => !removedProgIds.has(s.progId),
        );
      },
    },
    extraReducers: (builder) => {
      builder.addCase(`${sliceName}/getCustDocs/pending`, (state) => {
        state.customerDocs = [];
        state.programDocs = [];
        state.serviceDocs = [];
      });
    },
  });

export const createGetCustDocsThunk = (
  sliceName: string,
  slice: ReturnType<typeof createCustomerSlice>,
) =>
  createStreamThunk<CustomerContract, "runSearchScheme">({
    typePrefix: `${sliceName}/getCustDocs`,
    apiPath: "/realGreen/customer/api",
    opName: "runSearchScheme",
    onChunk: (dispatch, chunk) => {
      dispatch(slice.actions.receiveChunk(chunk));
      if (chunk.metrics?.cumulativeRecords) {
        dispatch(
          uiActions.setLoadingMessage(
            `${chunk.metrics.cumulativeRecords} ${chunk.stepName} loaded...`,
          ),
        );
      }
    },
  });

export const activeCustomersSlice = createCustomerSlice("activeCustomers");
export const activeCustomersGetDocs = createGetCustDocsThunk(
  "activeCustomers",
  activeCustomersSlice,
);
export const activeCustomersActions = {
  ...activeCustomersSlice.actions,
  getDocs: activeCustomersGetDocs,
};
export const activeCustomerReducer = activeCustomersSlice.reducer;

export const printedCustomersSlice = createCustomerSlice("printedCustomers");
export const printedCustomersGetDocs = createGetCustDocsThunk(
  "printedCustomers",
  printedCustomersSlice,
);
export const printedCustomersActions = {
  ...printedCustomersSlice.actions,
  getDocs: printedCustomersGetDocs,
};
export const printedCustomerReducer = printedCustomersSlice.reducer;

export const lastSeasonProductionSlice = createCustomerSlice(
  "lastSeasonProduction",
);
export const lastSeasonProductionGetDocs = createGetCustDocsThunk(
  "lastSeasonProduction",
  lastSeasonProductionSlice,
);
export const lastSeasonProductionActions = {
  ...lastSeasonProductionSlice.actions,
  getDocs: lastSeasonProductionGetDocs,
};
export const lastSeasonProductionReducer = lastSeasonProductionSlice.reducer;

export const recentProductionSlice = createCustomerSlice("recentProduction");
export const recentProductionGetDocs = createGetCustDocsThunk(
  "recentProduction",
  recentProductionSlice,
);
export const recentProductionActions = {
  ...recentProductionSlice.actions,
  getDocs: recentProductionGetDocs,
};
export const recentProductionReducer = recentProductionSlice.reducer;

export const singleCustomerSlice = createCustomerSlice("singleCustomer");
export const singleCustomerGetDocs = createGetCustDocsThunk(
  "singleCustomer",
  singleCustomerSlice,
);
export const singleCustomerActions = {
  ...singleCustomerSlice.actions,
  getDocs: singleCustomerGetDocs,
};
export const singleCustomerReducer = singleCustomerSlice.reducer;

export const byAssignmentSlice = createCustomerSlice("byAssignment");
export const byAssignmentGetDocs = createGetCustDocsThunk(
  "byAssignment",
  byAssignmentSlice,
);
export const byAssignmentActions = {
  ...byAssignmentSlice.actions,
  getDocs: byAssignmentGetDocs,
};
export const byAssignmentReducer = byAssignmentSlice.reducer;

// ---------------------------------------------------------------------------
// Slice registry — single source of truth for all customer slice instances.
// The central slice loops over this to register extraReducers, eliminating
// the need to add per-slice boilerplate every time a new slice is created.
// ---------------------------------------------------------------------------

export type CustomerSliceActions = ReturnType<
  typeof createCustomerSlice
>["actions"];
export type CustomerSliceGetDocs = ReturnType<typeof createGetCustDocsThunk>;

export type CustomerContextMode =
  | "active"
  | "byAssignment"
  | "printed"
  | "lastSeasonProduction"
  | "recentProduction"
  | "single";

export type CustomerSliceRegistryEntry = {
  /** The CustomerContextMode key this slice maps to. */
  context: CustomerContextMode;
  actions: CustomerSliceActions;
  getDocs: CustomerSliceGetDocs;
  reducer: ReturnType<typeof createCustomerSlice>["reducer"];
};

export const customerSliceRegistry: CustomerSliceRegistryEntry[] = [
  {
    context: "active",
    actions: activeCustomersActions,
    getDocs: activeCustomersGetDocs,
    reducer: activeCustomerReducer,
  },
  {
    context: "printed",
    actions: printedCustomersActions,
    getDocs: printedCustomersGetDocs,
    reducer: printedCustomerReducer,
  },
  {
    context: "lastSeasonProduction",
    actions: lastSeasonProductionActions,
    getDocs: lastSeasonProductionGetDocs,
    reducer: lastSeasonProductionReducer,
  },
  {
    context: "recentProduction",
    actions: recentProductionActions,
    getDocs: recentProductionGetDocs,
    reducer: recentProductionReducer,
  },
  {
    context: "single",
    actions: singleCustomerActions,
    getDocs: singleCustomerGetDocs,
    reducer: singleCustomerReducer,
  },
  {
    context: "byAssignment",
    actions: byAssignmentActions,
    getDocs: byAssignmentGetDocs,
    reducer: byAssignmentReducer,
  },
];

// Compile-time exhaustiveness check: errors if any CustomerContextMode is missing from the registry.
type _RegistryContexts = (typeof customerSliceRegistry)[number]["context"];
type _ExhaustiveRegistry = [_RegistryContexts] extends [CustomerContextMode]
  ? [CustomerContextMode] extends [_RegistryContexts]
    ? true
    : never
  : never;
const _exhaustiveRegistryCheck: _ExhaustiveRegistry = true;
