"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "../quickSendSlice";
import { quickSendSelect } from "../quickSendSelect";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { Label } from "@/style/components/label";
import { Number } from "@/components/Number";

export function TaxRateOverride() {
  const dispatch = useAppDispatch();
  const customerState = useSelector(quickSendSelect.customerState);
  const zipCodes = useSelector(zipCodeSelect.zipCodes);
  const effectiveTaxRate = useSelector(quickSendSelect.effectiveTaxRate);

  const customerTaxRate = customerState.customer?.taxRate ?? null;
  const zipOverride = customerState.taxRateZipOverride;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    dispatch(quickSendActions.setTaxRateZipOverride(value === "" ? null : value));
  };

  const sortedZipCodes = [...zipCodes].sort((a, b) => a.zip.localeCompare(b.zip));

  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-b border-border">
      <Label className="text-xs text-muted-foreground">Tax rate</Label>
      {customerTaxRate != null && (
        <p className="text-xs text-muted-foreground">
          Customer rate:{" "}
          <span className="font-medium text-foreground">
            {customerTaxRate.toFixed(3)}%
          </span>
        </p>
      )}
      <select
        value={zipOverride ?? ""}
        onChange={handleChange}
        className="text-xs rounded border border-border bg-card text-foreground px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">
          {customerTaxRate != null
            ? `Use customer rate (${customerTaxRate.toFixed(3)}%)`
            : "Use customer rate"}
        </option>
        {sortedZipCodes.map((zipCode) => (
          <option key={zipCode.zip} value={zipCode.zip}>
            {zipCode.zip} — {zipCode.city} ({zipCode.taxRate.toFixed(3)}%)
          </option>
        ))}
      </select>
      {effectiveTaxRate != null && (
        <p className="text-xs text-muted-foreground">
          Effective:{" "}
          <span className="font-medium text-foreground">
            <Number decimals={3}>{effectiveTaxRate}</Number>%
          </span>
        </p>
      )}
    </div>
  );
}
