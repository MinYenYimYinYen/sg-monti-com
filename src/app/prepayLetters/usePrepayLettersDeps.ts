import { useSelector } from "react-redux";
import { usePrepayConfig } from "./config/usePrepayConfig";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";

const RENEWAL_CUST_STATUSES = ["9"];

export function usePrepayLettersDeps() {
  usePrepayConfig({ autoLoad: true });
  useGlobalSettings({ autoLoad: true });
  useFlag({ autoLoad: true });

  const { autoRenew, dontAutoRenew, confirmed } = useSelector(globalSettingsSelect.renewalFlagIds);
  const renewalFlagIds = [autoRenew, dontAutoRenew, confirmed].filter(
    (flagId): flagId is number => flagId !== null,
  );
  useCustFlag({ flagIds: renewalFlagIds, custStatuses: RENEWAL_CUST_STATUSES });
}
