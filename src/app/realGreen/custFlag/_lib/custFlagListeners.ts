import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { AppDispatch, AppState } from "@/store";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import {
  activeCustomersRefresh,
  byAssignmentRefresh,
  fullSeasonServicesRefresh,
  lastSeasonProductionRefresh,
  multiSeasonProductionRefresh,
  printedCustomersRefresh,
  priorityServiceCustomerRefresh,
  recentProductionRefresh,
  singleCustomerRefresh,
} from "@/app/realGreen/customer/slices/customerSlices";
import { StreamChunkData } from "@/app/realGreen/customer/api/CustomerContract";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";

export const custFlagListenerMiddleware = createListenerMiddleware<AppState, AppDispatch>();

/**
 * After any customer refresh completes, reconcile custFlag state for that customer.
 *
 * Fetches the customer's current flags from RealGreen and updates flagIdCustIds
 * by adding or removing the custId from each loaded flagId entry. This keeps
 * customer.flags in sync after a customer is refreshed (e.g., after assigning
 * or removing a flag in the CRM).
 *
 * No-op when no flagIds are loaded in state (custFlag not yet initialized).
 * Covers all customer slice contexts so the behavior is consistent regardless
 * of which slice triggered the refresh.
 */
custFlagListenerMiddleware.startListening({
  matcher: isAnyOf(
    activeCustomersRefresh.fulfilled,
    printedCustomersRefresh.fulfilled,
    lastSeasonProductionRefresh.fulfilled,
    recentProductionRefresh.fulfilled,
    singleCustomerRefresh.fulfilled,
    byAssignmentRefresh.fulfilled,
    priorityServiceCustomerRefresh.fulfilled,
    multiSeasonProductionRefresh.fulfilled,
    fullSeasonServicesRefresh.fulfilled,
  ),
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const flagIdsInState = custFlagSelect.flagIdsInState(state);

    // No-op: no flags loaded yet — nothing to reconcile
    if (flagIdsInState.length === 0) return;

    const payload = action.payload as StreamChunkData;
    const meta = action.meta as { arg: WithConfig<{ custId: number }> };
    const params = meta.arg.params;

    // custId from the refreshed customer docs, or from the thunk params when
    // customerDocs is empty (customer was removed from the CRM).
    const custId = payload.customerDocs[0]?.custId ?? params.custId;

    if (!custId) return;

    // Cast to AppDispatch to satisfy the typed thunk dispatch requirement
    (listenerApi.dispatch as AppDispatch)(
      custFlagActions.refreshCustFlags({
        params: { custId, flagIdsInState },
        config: { showLoading: false },
      }),
    );
  },
});
