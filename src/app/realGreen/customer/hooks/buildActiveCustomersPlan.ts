import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

/**
 * Mirror query plan: every active customer with their active programs and
 * live services for the given season. Shared by every hook that loads an
 * "active customers" shaped dataset into its own slice.
 */
export function buildActiveCustomersPlan(season: number) {
  return new QueryBuilder()
    // Seed: all active customers (status "9")
    .addCustomerStep(["entity", "provider"], {
      stepName: "getCustomers",
      source: "values",
      filters: [{ field: "status", operator: "eq", value: "9" }],
      provides: { custId: true },
    })
    // Active programs for the season
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getCustomers",
      joinKey: "custId",
      filters: [
        { field: "season", operator: "eq", value: season },
        { field: "status", operator: "eq", value: "9" },
      ],
      provides: { progId: true },
    })
    // Services for those programs (season, active/asap/printed/completed)
    .addServiceStep(["entity"], {
      stepName: "getServices",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "progId",
      filters: [
        { field: "season", operator: "eq", value: season },
        { field: "status", operator: "in", value: getServiceStatuses(["active", "asap", "printed", "completed"]) },
      ],
    })
    .build();
}
