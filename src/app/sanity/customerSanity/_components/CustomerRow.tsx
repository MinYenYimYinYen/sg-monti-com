"use client";

import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";

type CustomerRowProps = {
  customer: Customer;
};

export function CustomerRow({ customer }: CustomerRowProps) {
  const isAutoRenew = customer.x.isAutoRenew;
  const isDontAutoRenew = customer.x.isDontAutoRenew;

  const autoRenewFlag = isAutoRenew
    ? customer.flags.find((f) => f.flagId === customer.x.renewalFlagIds?.autoRenew)
    : null;
  const dontAutoRenewFlag = isDontAutoRenew
    ? customer.flags.find((f) => f.flagId === customer.x.renewalFlagIds?.dontAutoRenew)
    : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm">
      <CustomerLink
        customerId={customer.custId}
        customerTab="customer"
        className="font-medium text-primary hover:underline truncate flex-1"
      >
        {customer.displayName}
      </CustomerLink>

      {isAutoRenew && (
        <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
          {autoRenewFlag?.desc ?? "Auto Renew"}
        </span>
      )}

      {isDontAutoRenew && (
        <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
          {dontAutoRenewFlag?.desc ?? "Don't Auto Renew"}
        </span>
      )}
    </div>
  );
}
