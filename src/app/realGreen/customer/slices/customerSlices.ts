import {
  BaseCustomerState,
  baseInitialState,
} from "@/app/realGreen/customer/slices/SliceTypes";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CustomerContract,
  StreamChunk,
  StreamChunkData,
} from "@/app/realGreen/customer/api/CustomerContract";
import { createStandardThunk, createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import { uiActions } from "@/store/reduxUtil/uiSlice";
import { searchScheme } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchSchemes";

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
      /** Merges a full set of refreshed docs for a single customer into the slice. */
      receiveBulk(state, action: PayloadAction<Partial<StreamChunkData>>) {
        const { customerDocs, programDocs, serviceDocs } = action.payload;
        if (customerDocs) state.customerDocs.push(...customerDocs);
        if (programDocs) state.programDocs.push(...programDocs);
        if (serviceDocs) state.serviceDocs.push(...serviceDocs);
      },
      /**
       * Atomically replaces a single customer's docs in-place, preserving array position.
       * Unlike removeCustomer + receiveBulk, this does not delete-then-reinsert — it
       * overwrites existing entries so the customer stays at the same index in the list.
       */
      replaceCustomer(state, action: PayloadAction<StreamChunkData>) {
        const { customerDocs, programDocs, serviceDocs } = action.payload;
        if (customerDocs.length === 0) return;
        const custId = customerDocs[0].custId;

        // Collect old progIds for this customer so we can remove their services
        const oldProgIds = new Set(
          state.programDocs.filter((p) => p.custId === custId).map((p) => p.progId),
        );

        // Replace customer doc in-place (overwrite at same index)
        const custIdx = state.customerDocs.findIndex((c) => c.custId === custId);
        if (custIdx !== -1 && customerDocs[0]) {
          state.customerDocs[custIdx] = customerDocs[0];
        } else if (customerDocs[0]) {
          state.customerDocs.push(customerDocs[0]);
        }

        // Remove old programs and services for this customer
        state.programDocs = state.programDocs.filter((p) => p.custId !== custId);
        state.serviceDocs = state.serviceDocs.filter((s) => !oldProgIds.has(s.progId));

        // Insert new programs and services
        state.programDocs.push(...programDocs);
        state.serviceDocs.push(...serviceDocs);
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

/**
 * Creates a non-streaming thunk that refreshes a single customer's data using
 * the same search scheme that originally loaded the dataset. The scheme name is
 * baked in at creation time so the refreshed data is always congruent with the
 * rest of the central Maps.
 *
 * Usage: dispatch the returned thunk, then on fulfillment dispatch receiveBulk.
 * See useRefreshCustomer hook for the full orchestration.
 */
export const createRefreshCustomerThunk = (
  sliceName: string,
  schemeName: keyof typeof searchScheme,
) =>
  createStandardThunk<CustomerContract, "refreshCustomer">({
    typePrefix: `${sliceName}/refreshCustomer`,
    apiPath: "/realGreen/customer/api",
    opName: "refreshCustomer",
  });

export const activeCustomersSlice = createCustomerSlice("activeCustomers");
export const activeCustomersGetDocs = createGetCustDocsThunk("activeCustomers", activeCustomersSlice);
export const activeCustomersRefresh = createRefreshCustomerThunk("activeCustomers", "activeCustomers");
export const activeCustomersActions = {
  ...activeCustomersSlice.actions,
  getDocs: activeCustomersGetDocs,
  refreshCustomer: activeCustomersRefresh,
};
export const activeCustomerReducer = activeCustomersSlice.reducer;

export const printedCustomersSlice = createCustomerSlice("printedCustomers");
export const printedCustomersGetDocs = createGetCustDocsThunk("printedCustomers", printedCustomersSlice);
export const printedCustomersRefresh = createRefreshCustomerThunk("printedCustomers", "printedCustomers");
export const printedCustomersActions = {
  ...printedCustomersSlice.actions,
  getDocs: printedCustomersGetDocs,
  refreshCustomer: printedCustomersRefresh,
};
export const printedCustomerReducer = printedCustomersSlice.reducer;

export const lastSeasonProductionSlice = createCustomerSlice("lastSeasonProduction");
export const lastSeasonProductionGetDocs = createGetCustDocsThunk("lastSeasonProduction", lastSeasonProductionSlice);
export const lastSeasonProductionRefresh = createRefreshCustomerThunk("lastSeasonProduction", "lastSeasonProduction");
export const lastSeasonProductionActions = {
  ...lastSeasonProductionSlice.actions,
  getDocs: lastSeasonProductionGetDocs,
  refreshCustomer: lastSeasonProductionRefresh,
};
export const lastSeasonProductionReducer = lastSeasonProductionSlice.reducer;

export const recentProductionSlice = createCustomerSlice("recentProduction");
export const recentProductionGetDocs = createGetCustDocsThunk("recentProduction", recentProductionSlice);
export const recentProductionRefresh = createRefreshCustomerThunk("recentProduction", "recentProduction");
export const recentProductionActions = {
  ...recentProductionSlice.actions,
  getDocs: recentProductionGetDocs,
  refreshCustomer: recentProductionRefresh,
};
export const recentProductionReducer = recentProductionSlice.reducer;

export const singleCustomerSlice = createCustomerSlice("singleCustomer");
export const singleCustomerGetDocs = createGetCustDocsThunk("singleCustomer", singleCustomerSlice);
export const singleCustomerRefresh = createRefreshCustomerThunk("singleCustomer", "singleCustomer");
export const singleCustomerActions = {
  ...singleCustomerSlice.actions,
  getDocs: singleCustomerGetDocs,
  refreshCustomer: singleCustomerRefresh,
};
export const singleCustomerReducer = singleCustomerSlice.reducer;

export const byAssignmentSlice = createCustomerSlice("byAssignment");
export const byAssignmentGetDocs = createGetCustDocsThunk("byAssignment", byAssignmentSlice);
export const byAssignmentRefresh = createRefreshCustomerThunk("byAssignment", "byServIds");
export const byAssignmentActions = {
  ...byAssignmentSlice.actions,
  getDocs: byAssignmentGetDocs,
  refreshCustomer: byAssignmentRefresh,
};
export const byAssignmentReducer = byAssignmentSlice.reducer;

export const priorityServiceCustomerSlice = createCustomerSlice("priorityServiceCustomer");
export const priorityServiceCustomerGetDocs = createGetCustDocsThunk("priorityServiceCustomer", priorityServiceCustomerSlice);
export const priorityServiceCustomerRefresh = createRefreshCustomerThunk("priorityServiceCustomer", "activeCustomers");
export const priorityServiceCustomerActions = {
  ...priorityServiceCustomerSlice.actions,
  getDocs: priorityServiceCustomerGetDocs,
  refreshCustomer: priorityServiceCustomerRefresh,
};
export const priorityServiceCustomerReducer = priorityServiceCustomerSlice.reducer;

export const multiSeasonProductionSlice = createCustomerSlice("multiSeasonProduction");
export const multiSeasonProductionGetDocs = createGetCustDocsThunk("multiSeasonProduction", multiSeasonProductionSlice);
export const multiSeasonProductionRefresh = createRefreshCustomerThunk("multiSeasonProduction", "multiSeasonProduction");
export const multiSeasonProductionActions = {
  ...multiSeasonProductionSlice.actions,
  getDocs: multiSeasonProductionGetDocs,
  refreshCustomer: multiSeasonProductionRefresh,
};
export const multiSeasonProductionReducer = multiSeasonProductionSlice.reducer;

export const fullSeasonServicesSlice = createCustomerSlice("fullSeasonServices");
export const fullSeasonServicesGetDocs = createGetCustDocsThunk("fullSeasonServices", fullSeasonServicesSlice);
export const fullSeasonServicesRefresh = createRefreshCustomerThunk("fullSeasonServices", "fullSeasonServices");
export const fullSeasonServicesActions = {
  ...fullSeasonServicesSlice.actions,
  getDocs: fullSeasonServicesGetDocs,
  refreshCustomer: fullSeasonServicesRefresh,
};
export const fullSeasonServicesReducer = fullSeasonServicesSlice.reducer;

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
  | "fullSeasonServices"
  | "priorityService"
  | "printed"
  | "lastSeasonProduction"
  | "recentProduction"
  | "single"
  | "multiSeasonProduction";

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
  {
    context: "priorityService",
    actions: priorityServiceCustomerActions,
    getDocs: priorityServiceCustomerGetDocs,
    reducer: priorityServiceCustomerReducer,
  },
  {
    context: "multiSeasonProduction",
    actions: multiSeasonProductionActions,
    getDocs: multiSeasonProductionGetDocs,
    reducer: multiSeasonProductionReducer,
  },
  {
    context: "fullSeasonServices",
    actions: fullSeasonServicesActions,
    getDocs: fullSeasonServicesGetDocs,
    reducer: fullSeasonServicesReducer,
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
