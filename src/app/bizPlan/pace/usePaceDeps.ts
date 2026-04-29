import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";

export function usePaceDeps() {
  useCustomerContext({contexts: ['active']})
  useProgServ({autoLoad: true})
  useActiveCustomers({autoLoad: true})

}