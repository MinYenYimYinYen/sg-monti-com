"use client";

import { useSelector } from "react-redux";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { Info, RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/style/components/tooltip";

type ZeroCustomerRowProps = {
  customer: Customer;
};

export function ZeroCustomerRow({ customer }: ZeroCustomerRowProps) {
  const { refreshCustomer, isRefreshingCustomer } = useFullSeasonServices();
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);
  const flagDocMap = useSelector(flagSelect.flagDocMap);

  const activePrograms = customer.programs.filter((p) => p.status === "9");
  const isRefreshing = isRefreshingCustomer(customer.custId);
  const hasDontAutoRenew = customer.x.isDontAutoRenew;

  // Collect the renewal flags present on this customer
  const renewalFlagIdSet = new Set(
    [renewalFlagIds?.autoRenew, renewalFlagIds?.dontAutoRenew, renewalFlagIds?.confirmed].filter(
      (id): id is number => id !== null && id !== undefined,
    ),
  );
  const customerRenewalFlags = customer.flags.filter((f) => renewalFlagIdSet.has(f.flagId));

  // Resolve flag descriptions for the warning tooltip
  const dontAutoRenewDesc =
    renewalFlagIds?.dontAutoRenew !== null && renewalFlagIds?.dontAutoRenew !== undefined
      ? (flagDocMap.get(renewalFlagIds.dontAutoRenew)?.desc ?? "Don't Auto Renew")
      : "Don't Auto Renew";
  const autoRenewDesc =
    renewalFlagIds?.autoRenew !== null && renewalFlagIds?.autoRenew !== undefined
      ? (flagDocMap.get(renewalFlagIds.autoRenew)?.desc ?? "Auto Renew")
      : "Auto Renew";

  const warningMessage = `If this customer is being moved to cancel or reject, should we really have a "${dontAutoRenewDesc}" flag, or should we have "${autoRenewDesc}" instead?`;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md border bg-card text-sm ${
        hasDontAutoRenew ? "border-destructive" : "border-border"
      }`}
    >
      {/* Warning icon for dontAutoRenew */}
      {hasDontAutoRenew && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 shrink-0 text-destructive cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-center">
              {warningMessage}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <CustomerLink
        customerId={customer.custId}
        customerTab="customer"
        className="font-medium text-primary hover:underline truncate"
      >
        {customer.displayName}
      </CustomerLink>

      {/* Renewal flags — shown immediately after the customer name, left-aligned */}
      {customerRenewalFlags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {customerRenewalFlags.map((flag) => (
            <span
              key={flag.flagId}
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                flag.flagId === renewalFlagIds?.dontAutoRenew
                  ? "bg-destructive/10 text-destructive"
                  : "bg-accent/20 text-foreground/70"
              }`}
            >
              {flag.desc}
            </span>
          ))}
        </div>
      )}

      {/* Spacer to push program links and refresh button to the right */}
      <div className="flex-1" />

      {/* Zero-revenue program links */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {activePrograms.map((program) => (
          <ProgramLink
            key={program.progId}
            programId={program.progId}
            className="rounded px-1.5 py-0.5 text-xs font-medium font-mono bg-destructive/10 text-destructive hover:underline"
          >
            {program.progCode.progCodeId}
          </ProgramLink>
        ))}
      </div>

      <Button
        variant="primary"
        intensity="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => refreshCustomer(customer.custId)}
        disabled={isRefreshing}
        title="Refresh customer data"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
