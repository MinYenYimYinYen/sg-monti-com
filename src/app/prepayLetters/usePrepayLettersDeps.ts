import { useSelector } from "react-redux";
import { usePrepayConfig } from "./config/usePrepayConfig";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";
import { useUpsellPriorities } from "./upsellPriorities/useUpsellPriorities";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useFormTemplate } from "@/app/formTemplate/useFormTemplate";
import { useCompany } from "@/app/realGreen/company/useCompany";
import {usePriceTable} from "@/app/realGreen/priceTable/usePriceTable";
import {useTaxCode} from "@/app/realGreen/taxCode/useTaxCode";

const RENEWAL_CUST_STATUSES = ["9"];

export function usePrepayLettersDeps() {
  usePrepayConfig({ autoLoad: true });
  useUpsellPriorities({ autoLoad: true });
  useProgServ({ autoLoad: true });
  usePriceTable({ autoLoad: true });
  useTaxCode( { autoLoad: true });
  useGlobalSettings({ autoLoad: true });
  useFlag({ autoLoad: true });
  useFormTemplate({ autoLoad: true });
  useCompany({ autoLoad: true });

  const { autoRenew, dontAutoRenew, confirmed } = useSelector(globalSettingsSelect.renewalFlagIds);
  const renewalFlagIds = [autoRenew, dontAutoRenew, confirmed].filter(
    (flagId): flagId is number => flagId !== null,
  );
  useCustFlag({ flagIds: renewalFlagIds, custStatuses: RENEWAL_CUST_STATUSES });
}
