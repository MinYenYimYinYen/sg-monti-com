"use client";

import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import { describeCents } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxMoneyUtils";
import {
  describeAdjustment,
  PaymentPreview,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingPreviewUtils";

/**
 * The typed amount and what it implies. A text input, so there are no spin arrows to change an
 * amount by accident, and it selects its text on focus so typing replaces the old value.
 */
export function PaymentAmountField({
  amountText,
  onChangeAction,
  preview,
  periodEnd,
}: {
  amountText: string;
  onChangeAction: (amountText: string) => void;
  preview: PaymentPreview;
  periodEnd: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="salesTaxPaymentAmount">Payment amount</Label>
      <Input
        id="salesTaxPaymentAmount"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className="max-w-48 text-right tabular-nums"
        value={amountText}
        onFocus={(event) => event.target.select()}
        onChange={(event) => onChangeAction(event.target.value)}
      />
      {preview.problem ? (
        <p className="text-sm text-secondary">{preview.problem}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {describeAdjustment({ adjustmentCents: preview.adjustmentCents, periodEnd })}
        </p>
      )}
      {preview.adjustmentIsLarge && preview.adjustmentCents !== null && (
        <div className="rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-secondary">
          This adjustment is {describeCents(Math.abs(preview.adjustmentCents))}, more than{" "}
          {describeCents(qboConst.salesTaxAdjustmentWarnCents)}. Check the amount you typed. It will
          still post.
        </div>
      )}
    </div>
  );
}
