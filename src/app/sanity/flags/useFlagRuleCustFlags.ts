import { useSelector } from "react-redux";
import { flagRuleSelect } from "@/app/flagRule/flagRuleSelect";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";

const ACTIVE_STATUSES = ["9"];

/**
 * Watches the loaded FlagRules and ensures custFlag data is loaded for every
 * flagId referenced by any rule. Without this, customer.flags will be empty
 * for those flagIds and every customer will appear to violate XOR rules.
 *
 * Uses status "9" (active customers only), consistent with the active customer context.
 */
export function useFlagRuleCustFlags() {
  const allRuleFlagIds = useSelector(flagRuleSelect.allRuleFlagIds);
  useCustFlag({ flagIds: allRuleFlagIds, custStatuses: ACTIVE_STATUSES });
}
