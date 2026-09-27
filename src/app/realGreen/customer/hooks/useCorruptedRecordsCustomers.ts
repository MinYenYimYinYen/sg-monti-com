import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { corruptedRecordsCustomerActions } from "@/app/realGreen/customer/slices/customerSlices";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";

/**
 * Dispatches the mirror thunk to fetch the customer/program/service hierarchy
 * for a set of neighbor service IDs captured from corrupted sync records.
 *
 * The plan fetches:
 * 1. Services by servId (the neighbor IDs)
 * 2. Customers for those services (via custId join)
 * 3. Programs for those services (via progId join)
 *
 * Results flow into the `corruptedRecords` customer slice and are accessible
 * via `centralSelect.services` / `service.x.customer` once the
 * `corruptedRecords` context is active (set by useCustomerContext).
 */
export function useCorruptedRecordsCustomers(servIds: number[]) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (servIds.length === 0) return;

    const plan = new QueryBuilder()
      .addServiceStep(["entity", "provider"], {
        stepName: "neighborServices",
        source: "values",
        filters: [{ field: "servId", operator: "in", value: servIds }],
        provides: { custId: true, progId: true },
      })
      .addCustomerStep(["entity"], {
        stepName: "neighborCustomers",
        source: "step",
        fromStep: "neighborServices",
        joinKey: "custId",
        filters: [],
      })
      .addProgramStep(["entity"], {
        stepName: "neighborPrograms",
        source: "step",
        fromStep: "neighborServices",
        joinKey: "progId",
        filters: [],
      })
      .build();

    console.log("[corruptedRecords] Hook dispatching query with servIds:", servIds);
    dispatch(
      corruptedRecordsCustomerActions.getDocs({
        params: { plan },
        config: {
          loadingMsg: "Loading neighbor records...",
          // Prevent re-dispatch on re-render — the params hash (derived from the plan)
          // acts as the cache key. 5 minutes is sufficient for an investigation session.
          staleTime: 5 * 60 * 1000,
        },
      }),
    );
  }, [dispatch, servIds]);
}
