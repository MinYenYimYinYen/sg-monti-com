import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useZipCode } from "@/app/realGreen/zipCode/useZipCode";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

export function useCustomerValueDeps() {
  useCustomerContext({ contexts: ["active"] });
  useActiveCustomers({ autoLoad: true });
  useProgServ({autoLoad: true})
  useZipCode({ autoLoad: true });
}
