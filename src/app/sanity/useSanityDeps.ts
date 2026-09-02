import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useFlagRule } from "@/app/flagRule/useFlagRule";
import { useFlagRuleCustFlags } from "@/app/sanity/flags/useFlagRuleCustFlags";
import { useRenewalFlagIds } from "@/app/globalSettings/_lib/useRenewalFlagIds";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";

export function useSanityDeps() {
  useCustomerContext({ contexts: ["fullSeasonServices"] });
  useFullSeasonServices({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useFlag({ autoLoad: true });
  useFlagRule({ autoLoad: true });
  useFlagRuleCustFlags();
  useRenewalFlagIds();
  useCallAhead({autoLoad: true})
}
