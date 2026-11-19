import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CustomerQueryPlan } from "@/app/realGreen/customer/mirror/CustomerQueryTypes";
import {
  customerQueryCustomerActions,
} from "@/app/realGreen/customer/slices/customerSlices";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

/**
 * General-purpose hook for dispatching ad-hoc customer queries against the mirror.
 *
 * Returns a `reload()` function that:
 * 1. Clears the customerQuery source slice's docs
 * 2. Re-syncs the central Maps (rebuilds from all active contexts, now without customerQuery data)
 * 3. Dispatches the new query — streaming refills the customerQuery slice and central Maps
 *
 * The caller is responsible for setting the "customerQuery" context via useCustomerContext
 * before calling reload(), so the central Maps receive the streamed data.
 *
 * Usage:
 * ```tsx
 * useCustomerContext({ contexts: ["corruptedRecords", "customerQuery"] });
 * const { reload } = useCustomerQuery({ plan });
 * // Call reload() on button click or when plan changes
 * ```
 */
export function useCustomerQuery({ plan }: { plan: CustomerQueryPlan }) {
  const dispatch = useAppDispatch();
  const activeContexts = useSelector(centralSelect.context);

  const reload = () => {
    // Step 1: Clear the customerQuery source slice's docs
    dispatch(customerQueryCustomerActions.clearDocs());

    // Step 2: Rebuild central Maps from all active contexts (customerQuery is now empty,
    // so only other contexts' data comes back). This prevents stale customerQuery data
    // from lingering in the central Maps while the new query loads.
    dispatch(centralCustomerActions.switchContexts(activeContexts));

    // Step 3: Fire the new query — streaming will repopulate the customerQuery slice
    // and the centralCustomerSlice extraReducer will merge chunks into the Maps.
    dispatch(
      customerQueryCustomerActions.getDocs({
        params: { plan },
        config: {
          loadingMsg: "Loading customer query...",
          // force: true bypasses the stale-time cache since we just cleared the data
          force: true,
        },
      }),
    );
  };

  return { reload };
}
