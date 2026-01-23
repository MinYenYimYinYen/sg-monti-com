import {
  CustomerCore,
  CustomerDoc,
} from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export async function extendCustomers(
  remapped: CustomerCore[],
): Promise<CustomerDoc[]> {
  //MOCKED for now
  const withMongo = remapped.map((cust) => ({
    ...cust,
    createdAt: "",
    updatedAt: "",
  }));
  return withMongo;
}