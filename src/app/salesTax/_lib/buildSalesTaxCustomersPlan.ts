import { TRange } from "@/lib/primatives/tRange/TRange";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { ServiceCore } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

/**
 * Completed services whose doneDate falls in `dateRange`, then their programs, then their customers.
 * Deliberately has no season filter: a sales tax month is defined by when the work was done.
 */
export function buildSalesTaxCustomersPlan(dateRange: TRange<string>) {
  return new QueryBuilder()
    .addServiceStep(["entity", "provider"], {
      stepName: "getServices",
      source: "values",
      filters: [
        { field: "status", operator: "in", value: getServiceStatuses(["completed"]) },
        // productionCore.doneDate is a nested path — cast field to bypass keyof constraint
        { field: "productionCore.doneDate" as keyof ServiceCore, operator: "gte", value: dateRange.min },
        { field: "productionCore.doneDate" as keyof ServiceCore, operator: "lte", value: dateRange.max },
      ],
      provides: { progId: true },
    })
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getServices",
      joinKey: "progId",
      filters: [],
      provides: { custId: true },
    })
    .addCustomerStep(["entity"], {
      stepName: "getCustomers",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "custId",
      filters: [],
    })
    .build();
}
