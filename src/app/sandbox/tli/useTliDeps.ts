import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useLastSeasonProduction } from "@/app/realGreen/customer/hooks/useLastSeasonProduction";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";

const TLI_CONTEXTS: CustomerContextMode[] = ["lastSeasonProduction", "active"];

export function useTliDeps({
  canLoad = {},
}: {
  canLoad?: {
    customers?: boolean;
    progCodes?: boolean;
    servCodes?: boolean;
    employees?: boolean;
  };
} = {}) {
  const {
    customers: canLoadCustomers = true,
    progCodes: canLoadProgCodes = true,
    servCodes: canLoadServCodes = true,
    employees: canLoadEmployees = true,
  } = canLoad;
  useCustomerContext({ contexts: TLI_CONTEXTS });
  useLastSeasonProduction({ autoLoad: true, canLoad: canLoadCustomers });
  useActiveCustomers({ autoLoad: true, canLoad: canLoadCustomers });
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: canLoadProgCodes, servCodes: canLoadServCodes },
  });
  useEmployee({ autoLoad: true, canLoad: canLoadEmployees });
}
