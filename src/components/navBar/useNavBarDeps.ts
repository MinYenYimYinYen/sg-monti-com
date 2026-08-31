import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useSelectedCustFlags } from "@/app/realGreen/custFlag/_lib/useSelectedCustFlags";

export function useNavBarDeps() {
  useFlag({ autoLoad: true });
  useSelectedCustFlags();
}
