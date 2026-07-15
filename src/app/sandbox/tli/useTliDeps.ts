import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useLastSeasonProduction } from "@/app/realGreen/customer/hooks/useLastSeasonProduction";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";

const TLI_CONTEXTS: CustomerContextMode[] = ["lastSeasonProduction", "active"];

export function useTliDeps() {
  useCustomerContext({ contexts: TLI_CONTEXTS });
  useLastSeasonProduction({ autoLoad: true });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
}
