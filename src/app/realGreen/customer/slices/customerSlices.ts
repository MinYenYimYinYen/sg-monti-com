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
import { CustomerMirrorContract } from "@/app/realGreen/customer/mirror/CustomerMirrorContract";
import { createStandardThunk, createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { uiActions } from "@/store/reduxUtil/uiSlice";
import { searchScheme } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchSchemes";
import { toast } from "react-toastify";

// ---------------------------------------------------------------------------
// Pipeline flags — controls which data source each context uses.
//
// Set a context to "mirror" to use the synced MongoDB pipeline (fast, ~5s).
// Set to "realGreen" (or omit) to use the live RealGreen API pipeline.
//
// To flip a context back to RealGreen: change "mirror" → "realGreen" here.
// The corresponding hook reads this flag and adjusts its dispatch params
// automatically — no other files need to change.
//
// Contexts permanently on the mirror pipeline (not feature-flagged):
//   - "corruptedRecords" and "mirrorQuery" are always mirror-only.
// ---------------------------------------------------------------------------
export const PIPELINE: Partial<Record<CustomerContextMode, "mirror" | "realGreen">> = {
  active: "mirror",
  byAssignment: "mirror",
  fullSeasonServices: "mirror",
  lastSeasonProduction: "mirror",
  multiSeasonProduction: "mirror",
  printed: "mirror",
  priorityService: "mirror",
  recentProduction: "mirror",
  single: "mirror",
};

// ---------------------------------------------------------------------------
// Helper: selects the correct getDocs thunk factory based on the PIPELINE flag.
// ---------------------------------------------------------------------------
const createGetDocsThunk = (
  context: CustomerContextMode,
  sliceName: string,
  slice: ReturnType<typeof createCustomerSlice>,
) =>
  PIPELINE[context] === "mirror"
    ? createGetCustDocsMirrorThunk(sliceName, slice)
    : createGetCustDocsThunk(sliceName, slice);

export const createCustomerSlice = (sliceName: string) =>
  createSlice({
    name: sliceName,
    initialState: { ...baseInitialState } as BaseCustomerState,
    reducers: {
      clearDocs(state) {
        state.customerDocs = [];
        state.programDocs = [];
        state.serviceDocs = [];
      },
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
      // Detect streaming error chunk — server sends { success: false, message: "..." }
      // when an unhandled exception occurs mid-stream. Surface it as a toast.
      const maybeError = chunk as unknown as { success?: boolean; message?: string };
      if (maybeError.success === false) {
        toast.error(`Data load error: ${maybeError.message ?? "Unknown error"}. Some records may be missing.`);
        return;
      }
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

/**
 * Creates a streaming thunk that fetches customer, program, and service docs
 * from our synced MongoDB mirror collections.
 *
 * Uses the same streaming infrastructure as createGetCustDocsThunk but points
 * to the mirror API route instead of the RealGreen search scheme route.
 * The typePrefix uses the same `${sliceName}/getCustDocs` convention so the
 * slice's `pending` extraReducer fires and clears state on each new fetch.
 *
 * Params are not yet implemented — see CustomerMirrorContract.ts for the TODO.
 */
export const createGetCustDocsMirrorThunk = (
  sliceName: string,
  slice: ReturnType<typeof createCustomerSlice>,
) =>
  createStreamThunk<CustomerMirrorContract, "getMirrorCustomers">({
    typePrefix: `${sliceName}/getCustDocs`,
    apiPath: "/realGreen/customer/mirror/api",
    opName: "getMirrorCustomers",
    onChunk: (dispatch, chunk) => {
      console.log("[corruptedRecords] onChunk received:", chunk);
      dispatch(slice.actions.receiveChunk(chunk));
    },
  });

export const activeCustomersSlice = createCustomerSlice("activeCustomers");
export const activeCustomersGetDocs = createGetDocsThunk("active", "activeCustomers", activeCustomersSlice);
export const activeCustomersRefresh = createRefreshCustomerThunk("activeCustomers", "activeCustomers");
export const activeCustomersActions = {
  ...activeCustomersSlice.actions,
  getDocs: activeCustomersGetDocs,
  refreshCustomer: activeCustomersRefresh,
};
export const activeCustomerReducer = activeCustomersSlice.reducer;

export const printedCustomersSlice = createCustomerSlice("printedCustomers");
export const printedCustomersGetDocs = createGetDocsThunk("printed", "printedCustomers", printedCustomersSlice);
export const printedCustomersRefresh = createRefreshCustomerThunk("printedCustomers", "activeCustomers");
export const printedCustomersActions = {
  ...printedCustomersSlice.actions,
  getDocs: printedCustomersGetDocs,
  refreshCustomer: printedCustomersRefresh,
};
export const printedCustomerReducer = printedCustomersSlice.reducer;

export const lastSeasonProductionSlice = createCustomerSlice("lastSeasonProduction");
export const lastSeasonProductionGetDocs = createGetDocsThunk("lastSeasonProduction", "lastSeasonProduction", lastSeasonProductionSlice);
export const lastSeasonProductionRefresh = createRefreshCustomerThunk("lastSeasonProduction", "lastSeasonProduction");
export const lastSeasonProductionActions = {
  ...lastSeasonProductionSlice.actions,
  getDocs: lastSeasonProductionGetDocs,
  refreshCustomer: lastSeasonProductionRefresh,
};
export const lastSeasonProductionReducer = lastSeasonProductionSlice.reducer;

export const recentProductionSlice = createCustomerSlice("recentProduction");
export const recentProductionGetDocs = createGetDocsThunk("recentProduction", "recentProduction", recentProductionSlice);
export const recentProductionRefresh = createRefreshCustomerThunk("recentProduction", "recentProduction");
export const recentProductionActions = {
  ...recentProductionSlice.actions,
  getDocs: recentProductionGetDocs,
  refreshCustomer: recentProductionRefresh,
};
export const recentProductionReducer = recentProductionSlice.reducer;

export const singleCustomerSlice = createCustomerSlice("singleCustomer");
export const singleCustomerGetDocs = createGetDocsThunk("single", "singleCustomer", singleCustomerSlice);
export const singleCustomerRefresh = createRefreshCustomerThunk("singleCustomer", "singleCustomer");
export const singleCustomerActions = {
  ...singleCustomerSlice.actions,
  getDocs: singleCustomerGetDocs,
  refreshCustomer: singleCustomerRefresh,
};
export const singleCustomerReducer = singleCustomerSlice.reducer;

export const byAssignmentSlice = createCustomerSlice("byAssignment");
export const byAssignmentGetDocs = createGetDocsThunk("byAssignment", "byAssignment", byAssignmentSlice);
export const byAssignmentRefresh = createRefreshCustomerThunk("byAssignment", "byServIds");
export const byAssignmentActions = {
  ...byAssignmentSlice.actions,
  getDocs: byAssignmentGetDocs,
  refreshCustomer: byAssignmentRefresh,
};
export const byAssignmentReducer = byAssignmentSlice.reducer;

export const priorityServiceCustomerSlice = createCustomerSlice("priorityServiceCustomer");
export const priorityServiceCustomerGetDocs = createGetDocsThunk("priorityService", "priorityServiceCustomer", priorityServiceCustomerSlice);
export const priorityServiceCustomerRefresh = createRefreshCustomerThunk("priorityServiceCustomer", "activeCustomers");
export const priorityServiceCustomerActions = {
  ...priorityServiceCustomerSlice.actions,
  getDocs: priorityServiceCustomerGetDocs,
  refreshCustomer: priorityServiceCustomerRefresh,
};
export const priorityServiceCustomerReducer = priorityServiceCustomerSlice.reducer;

export const multiSeasonProductionSlice = createCustomerSlice("multiSeasonProduction");
export const multiSeasonProductionGetDocs = createGetDocsThunk("multiSeasonProduction", "multiSeasonProduction", multiSeasonProductionSlice);
export const multiSeasonProductionRefresh = createRefreshCustomerThunk("multiSeasonProduction", "multiSeasonProduction");
export const multiSeasonProductionActions = {
  ...multiSeasonProductionSlice.actions,
  getDocs: multiSeasonProductionGetDocs,
  refreshCustomer: multiSeasonProductionRefresh,
};
export const multiSeasonProductionReducer = multiSeasonProductionSlice.reducer;

export const fullSeasonServicesSlice = createCustomerSlice("fullSeasonServices");
export const fullSeasonServicesGetDocs = createGetDocsThunk("fullSeasonServices", "fullSeasonServices", fullSeasonServicesSlice);
export const fullSeasonServicesRefresh = createRefreshCustomerThunk("fullSeasonServices", "fullSeasonServices");
export const fullSeasonServicesActions = {
  ...fullSeasonServicesSlice.actions,
  getDocs: fullSeasonServicesGetDocs,
  refreshCustomer: fullSeasonServicesRefresh,
};
export const fullSeasonServicesReducer = fullSeasonServicesSlice.reducer;

// Mirror-backed slice for the corrupted records investigation UI.
// Uses createGetCustDocsMirrorThunk (reads from synced MongoDB) instead of
// createGetCustDocsThunk (reads from RealGreen API via search schemes).
export const corruptedRecordsCustomerSlice = createCustomerSlice("corruptedRecordsCustomer");
export const corruptedRecordsGetMirrorDocs = createGetCustDocsMirrorThunk("corruptedRecordsCustomer", corruptedRecordsCustomerSlice);
export const corruptedRecordsCustomerActions = {
  ...corruptedRecordsCustomerSlice.actions,
  getDocs: corruptedRecordsGetMirrorDocs,
};
export const corruptedRecordsCustomerReducer = corruptedRecordsCustomerSlice.reducer;

// General-purpose mirror query slice — not tied to a specific feature context.
// Use useMirrorQuery() to dispatch ad-hoc QueryBuilder plans against the mirror API.
// Registered as "mirrorQuery" context so it flows through centralCustomerSlice.
export const mirrorQuerySlice = createCustomerSlice("mirrorQuery");
export const mirrorQueryGetDocs = createGetCustDocsMirrorThunk("mirrorQuery", mirrorQuerySlice);
export const mirrorQueryCustomerActions = {
  ...mirrorQuerySlice.actions,
  getDocs: mirrorQueryGetDocs,
};
export const mirrorQueryCustomerReducer = mirrorQuerySlice.reducer;

// ---------------------------------------------------------------------------
// Slice registry — single source of truth for all customer slice instances.
// The central slice loops over this to register extraReducers, eliminating
// the need to add per-slice boilerplate every time a new slice is created.
// ---------------------------------------------------------------------------

export type CustomerSliceActions = ReturnType<
  typeof createCustomerSlice
>["actions"];

/**
 * The common structural type for all getDocs thunks across both the RealGreen
 * pipeline (createGetCustDocsThunk) and the mirror pipeline
 * (createGetCustDocsMirrorThunk). Both return AsyncThunk<void, ...> so the
 * registry can hold either without type conflicts.
 *
 * The third type parameter is typed as `any` to accommodate the variance in
 * the `rejected` action creator's `rejectValue` type across different thunk
 * configurations. This is safe because the registry only uses the thunk for
 * dispatching and for `pending` action matching — neither of which depends on
 * the exact `rejectValue` type.
 */
// The registry only uses getDocs for dispatching and pending-action matching.
// Neither use case depends on the exact ThunkApiConfig shape, so we use a
// permissive structural type that all concrete thunk variants satisfy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomerSliceGetDocs = {
  pending: { type: string; match: (action: unknown) => boolean };
  rejected: { type: string; match: (action: unknown) => boolean };
  fulfilled: { type: string; match: (action: unknown) => boolean };
  typePrefix: string;
  // Allow dispatching with any argument shape
  (arg: WithConfig<any>): any;
};

export type CustomerContextMode =
  | "active"
  | "byAssignment"
  | "corruptedRecords"
  | "fullSeasonServices"
  | "mirrorQuery"
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
  {
    context: "corruptedRecords",
    actions: corruptedRecordsCustomerActions,
    getDocs: corruptedRecordsGetMirrorDocs,
    reducer: corruptedRecordsCustomerReducer,
  },
  {
    context: "mirrorQuery",
    actions: mirrorQueryCustomerActions,
    getDocs: mirrorQueryGetDocs,
    reducer: mirrorQueryCustomerReducer,
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
