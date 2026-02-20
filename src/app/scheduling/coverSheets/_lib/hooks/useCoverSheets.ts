import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useUnitConfig } from "@/app/realGreen/product/_lib/hooks/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";

export function useCoverSheets() {
  useCustomerContext({ contexts: ["printed"] });
  usePrintedCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true })
  useUnitConfig({autoLoad: true})
  useProduct({ autoLoad: true })
  useFlag({ autoLoad: true });
  useEmployee({autoLoad: true})
  const { localCoverSheetsConfig } = useGlobalSettings({ autoLoad: true });

  useCustFlag({ custStatuses: ["9"], flagIds: localCoverSheetsConfig.flagIds });


}
