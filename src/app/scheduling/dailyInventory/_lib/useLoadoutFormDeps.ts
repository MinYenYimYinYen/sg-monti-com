import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";

export function useLoadoutFormDeps() {
  useCustomerContext({ contexts: ["printed", "recentProduction"] });
  usePrintedCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useUnitConfig({ autoLoad: true });
  useProduct({ autoLoad: true });
  useEmployee({ autoLoad: true });

}