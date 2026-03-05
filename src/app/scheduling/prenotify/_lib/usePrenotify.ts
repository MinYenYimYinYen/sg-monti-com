import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";

export function usePrenotify() {
  useCustomerContext({ contexts: ["printed"] });
  usePrintedCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
  useCallAhead({ autoLoad: true });
}