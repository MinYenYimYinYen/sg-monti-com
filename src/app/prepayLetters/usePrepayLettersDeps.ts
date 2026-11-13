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
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";
import { useTaxCode } from "@/app/realGreen/taxCode/useTaxCode";
import { useDiscount } from "@/app/realGreen/discount/useDiscount";

const RENEWAL_CUST_STATUSES = ["9"];

/** Which of the loads this hook fires the caller may make. Absent means allowed. */
type CanLoad = {
  upsellPriorities?: boolean;
  formTemplates?: boolean;
  globalSettings?: boolean;
};

/**
 * `canLoad` comes from the layout, because hooks expose actions only and do not select. The
 * layout only mounts for a user who holds `prepayConfigs.read`, so that load needs no flag. The
 * RealGreen loads below are not declared yet (deferred), so they are ungated.
 */
export function usePrepayLettersDeps({ canLoad = {} }: { canLoad?: CanLoad } = {}) {
  const {
    upsellPriorities: canLoadUpsellPriorities = true,
    formTemplates: canLoadFormTemplates = true,
    globalSettings: canLoadGlobalSettings = true,
  } = canLoad;
  usePrepayConfig({ autoLoad: true });
  useUpsellPriorities({ autoLoad: true, canLoad: canLoadUpsellPriorities });
  useProgServ({ autoLoad: true });
  usePriceTable({ autoLoad: true });
  useTaxCode({ autoLoad: true });
  useDiscount({ autoLoad: true });
  useGlobalSettings({ autoLoad: true, canLoad: canLoadGlobalSettings });
  useFlag({ autoLoad: true });
  useFormTemplate({ autoLoad: true, canLoad: canLoadFormTemplates });
  useCompany({ autoLoad: true });

  const { autoRenew, dontAutoRenew, confirmed } = useSelector(
    globalSettingsSelect.renewalFlagIds,
  );
  const renewalFlagIds = [autoRenew, dontAutoRenew, confirmed].filter(
    (flagId): flagId is number => flagId !== null,
  );
  useCustFlag({ flagIds: renewalFlagIds, custStatuses: RENEWAL_CUST_STATUSES });
}
