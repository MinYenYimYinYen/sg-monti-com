import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { MirrorQueryPlan } from "@/app/realGreen/customer/mirror/MirrorTypes";
import {
  mirrorQueryCustomerActions,
} from "@/app/realGreen/customer/slices/customerSlices";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

/**
 * General-purpose hook for dispatching ad-hoc mirror queries.
 *
 * Returns a `reload()` function that:
 * 1. Clears the mirrorQuery source slice's docs
 * 2. Re-syncs the central Maps (rebuilds from all active contexts, now without mirrorQuery data)
 * 3. Dispatches the new query — streaming refills the mirrorQuery slice and central Maps
 *
 * The caller is responsible for setting the "mirrorQuery" context via useCustomerContext
 * before calling reload(), so the central Maps receive the streamed data.
 *
 * Usage:
 * ```tsx
 * useCustomerContext({ contexts: ["corruptedRecords", "mirrorQuery"] });
 * const { reload } = useMirrorQuery({ plan });
 * // Call reload() on button click or when plan changes
 * ```
 */
export function useMirrorQuery({ plan }: { plan: MirrorQueryPlan }) {
  const dispatch = useAppDispatch();
  const activeContexts = useSelector(centralSelect.context);

  const reload = () => {
    // Step 1: Clear the mirrorQuery source slice's docs
    dispatch(mirrorQueryCustomerActions.clearDocs());

    // Step 2: Rebuild central Maps from all active contexts (mirrorQuery is now empty,
    // so only other contexts' data comes back). This prevents stale mirrorQuery data
    // from lingering in the central Maps while the new query loads.
    dispatch(centralCustomerActions.switchContexts(activeContexts));

    // Step 3: Fire the new query — streaming will repopulate the mirrorQuery slice
    // and the centralCustomerSlice extraReducer will merge chunks into the Maps.
    dispatch(
      mirrorQueryCustomerActions.getDocs({
        params: { plan },
        config: {
          loadingMsg: "Loading mirror query...",
          // force: true bypasses the stale-time cache since we just cleared the data
          force: true,
        },
      }),
    );
  };

  return { reload };
}
