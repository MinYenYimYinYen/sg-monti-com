import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function useCoverSheets() {
  useCustomerContext({ contexts: ["printed"] });
  usePrintedCustomers({ autoLoad: true });
  useFlag({ autoLoad: true });
  const { localCoverSheetsConfig } = useGlobalSettings({ autoLoad: true });

  useCustFlag({ custStatuses: ["9"], flagIds: localCoverSheetsConfig.flagIds });


}
