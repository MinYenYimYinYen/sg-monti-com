"use client";

import { Flag } from "lucide-react";
import { CustomerIncreaseResult, getAssignFlagBlockReason } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";

const ACTIVE_STATUSES = ["9"];

type AssignFlagButtonProps = {
  result: CustomerIncreaseResult;
};

/**
 * Individual flag assignment button for a single CustomerIncreaseCard.
 * Disabled with a tooltip when assignment is not allowed.
 * Calls useCustFlag.addFlag on click.
 */
export function AssignFlagButton({ result }: AssignFlagButtonProps) {
  const increaseFlagMappings = useSelector(globalSettingsSelect.increaseFlagMappings);
  const exemptFlagId = useSelector(globalSettingsSelect.priceIncreaseExemptFlagId);
  const manualFlagId = useSelector(globalSettingsSelect.priceIncreaseManualFlagId);

  const flagIds = [
    ...increaseFlagMappings.map((m) => m.flagId),
    ...(exemptFlagId !== null ? [exemptFlagId] : []),
    ...(manualFlagId !== null ? [manualFlagId] : []),
  ];

  const { addFlag } = useCustFlag({ flagIds, custStatuses: ACTIVE_STATUSES });

  const blockReason = getAssignFlagBlockReason(result);
  const isDisabled = blockReason !== null;

  function handleClick() {
    if (!result.resolvedFlag) return;
    addFlag({ custIds: [result.customer.custId], flagId: result.resolvedFlag.flagId });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={blockReason ?? `Assign ${result.resolvedFlag?.desc ?? "flag"}`}
      className="ml-0.5 flex items-center text-foreground/30 hover:text-primary/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <Flag className="h-3 w-3" />
    </button>
  );
}
