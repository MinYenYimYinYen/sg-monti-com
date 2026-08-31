import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useFlagRule } from "@/app/flagRule/useFlagRule";
import { useFlagRuleCustFlags } from "@/app/sanity/flags/useFlagRuleCustFlags";

export function useSanityDeps() {
  useCustomerContext({ contexts: ["active"] });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useFlag({ autoLoad: true });
  useFlagRule({ autoLoad: true });
  useFlagRuleCustFlags();
}
