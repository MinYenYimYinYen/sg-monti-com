"use client";

import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/style/components/tooltip";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { describeOtherAccounts } from "@/app/qbo/importCCTxn/_lib/importAccountUtils";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

/**
 * Shown next to a merchant's account when the merchant has been posted to other accounts. The
 * account was filled in automatically and is worth a look: it could be wrong for this one. The
 * tooltip names the other accounts. Renders nothing when there are none.
 */
export function OtherAccountsIndicator({
  mapping,
  isCompact = false,
}: {
  mapping: Pick<MerchantMapping, "otherAccountIds"> | null;
  /** Shows the warning icon alone, for a crowded row. The tooltip still names the accounts. */
  isCompact?: boolean;
}) {
  const accountMap = useSelector(qboAccountSelect.accountMap);
  const otherAccountNames = describeOtherAccounts({ mapping, accountMap });
  if (otherAccountNames.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex cursor-help items-center gap-1 text-xs text-secondary"
            aria-label="This merchant has other accounts"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {!isCompact && "Other accounts"}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-semibold">Chosen automatically. This merchant is also posted to:</div>
            {otherAccountNames.map((name) => (
              <div key={name}>{name}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
