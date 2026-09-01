import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useSelectedCustFlags } from "@/app/realGreen/custFlag/_lib/useSelectedCustFlags";
import { useRenewalFlagIds } from "@/app/globalSettings/_lib/useRenewalFlagIds";

export function useNavBarDeps() {
  useFlag({ autoLoad: true });
  useSelectedCustFlags();
  useRenewalFlagIds();
}
