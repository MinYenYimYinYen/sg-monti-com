import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboCustomer, QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";
import { sortCustomersByName, summarizeCustomer } from "@/app/qbo/customer/_lib/qboCustomerUtils";

// Server only. Read-only. The where clause matters: a bare query may return active records
// only, and inactive customers must stay visible so a mapping that points at one can be flagged.
// Each customer is cut down before it leaves the server (see qboCustomerUtils). The query is
// still `select *`, so the cut happens here and not in QuickBooks.
export async function loadQboCustomers(): Promise<QboCustomerSummary[]> {
  const customers = await qboQueryAll<QboCustomer>({
    entity: "Customer",
    where: "Active IN (true, false)",
  });
  return sortCustomersByName(customers.map(summarizeCustomer));
}
