import { useSelector } from "react-redux";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";

const ACTIVE_STATUSES = ["9"];

/**
 * Ensures custFlag data is loaded for every flagId used by the price increase module:
 * - increaseFlagMappings (the increase flags assigned to customers)
 * - priceIncreaseExemptFlagId (customers exempt from price increases)
 * - priceIncreaseManualFlagId (customers with manual price increases)
 *
 * Without this, customer.flags will be empty for these flagIds and isExempt,
 * isManual, and hasIncreaseFlag will always be false — grouping and filtering
 * by those properties will produce incorrect results.
 *
 * Follows the same pattern as useFlagRuleCustFlags.
 */
export function usePriceIncreaseCustFlags() {
  const increaseFlagMappings = useSelector(globalSettingsSelect.increaseFlagMappings);
  const exemptFlagId = useSelector(globalSettingsSelect.priceIncreaseExemptFlagId);
  const manualFlagId = useSelector(globalSettingsSelect.priceIncreaseManualFlagId);

  const flagIds = [
    ...increaseFlagMappings.map((m) => m.flagId),
    ...(exemptFlagId !== null ? [exemptFlagId] : []),
    ...(manualFlagId !== null ? [manualFlagId] : []),
  ];

  useCustFlag({ flagIds, custStatuses: ACTIVE_STATUSES });
}
