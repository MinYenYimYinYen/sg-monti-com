"use client";

// THROWAWAY: see prepayProbe.ts. Shows counts, two or three sample services and the per-tax-code
// map. It never lists the loaded services or customers.
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { prepayProbeSelect } from "@/app/salesTax/_throwaway/prepayProbeSelect";
import { salesTaxSelect } from "@/app/salesTax/salesTaxSelect";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { taxCodeSelect } from "@/app/realGreen/taxCode/taxCodeSelectors";

const money = (amount: number | undefined) =>
  amount === undefined ? "undefined" : amount.toFixed(2);

export function PrepayProbePanel() {
  const probe = useSelector(prepayProbeSelect);
  const dateRange = useSelector(salesTaxUISelect.dateRange);
  const revenueByTaxCodeId = useSelector(salesTaxSelect.revenueByTaxCodeId);
  const taxCodeCount = useSelector(taxCodeSelect.taxCodes).length;

  // One console block per loaded result, so it can be compared with the CRM.
  useEffect(() => {
    if (!probe || probe.completedCount === 0) return;
    console.log("[salesTax probe] counts", { ...probe, samples: undefined });
    console.table(probe.samples);
    console.log("[salesTax probe] revenueByTaxCodeId", Object.fromEntries(revenueByTaxCodeId));
  }, [probe, revenueByTaxCodeId]);

  if (!probe) return <p className="text-sm text-muted-foreground">Pick a month.</p>;
  if (probe.completedCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No completed services loaded for {dateRange?.min} to {dateRange?.max}. Click Load.
      </p>
    );
  }

  const taxRows = [...revenueByTaxCodeId.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalTax = taxRows.reduce((sum, [, summary]) => sum + summary.taxAmount, 0);

  return (
    <div className="flex flex-col gap-6 text-sm">
      <section>
        <h2 className="mb-2 font-semibold">Does the API give us the new fields?</h2>
        <table className="tabular-nums">
          <tbody>
            <tr><td className="pr-4">Completed services in range</td><td>{probe.completedCount}</td></tr>
            <tr><td className="pr-4">ppyDiscAmt missing (needs full sync)</td><td>{probe.missingPpyDiscAmt}</td></tr>
            <tr><td className="pr-4">ppyDiscAmt === 0</td><td>{probe.ppyZero}</td></tr>
            <tr><td className="pr-4">ppyDiscAmt &gt; 0</td><td>{probe.ppyPositive}</td></tr>
            <tr><td className="pr-4">prepayId set</td><td>{probe.withPrepayId}</td></tr>
            <tr><td className="pr-4">prepayId set but ppyDiscAmt === 0</td><td>{probe.prepayIdButNoAmount}</td></tr>
            <tr><td className="pr-4">ppyDiscAmt &gt; 0 but no prepayId</td><td>{probe.amountButNoPrepayId}</td></tr>
            <tr><td className="pr-4">ppyDiscAmt exceeds discounted price</td><td>{probe.amountExceedsPrice}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Samples to check against the CRM</h2>
        {probe.samples.length === 0 && <p>No samples matched.</p>}
        <div className="flex flex-col gap-3">
          {probe.samples.map((sample) => (
            <div key={sample.label} className="rounded-md border border-border bg-card p-3">
              <div className="mb-1 font-medium">{sample.label}</div>
              <div className="font-mono text-xs leading-5">
                custId {sample.custId} · servId {sample.servId} · {sample.servCodeId}
                <br />
                price {money(sample.price)} · after service/program discounts{" "}
                {money(sample.afterServiceAndProgramDiscounts)} · ppyDiscAmt {money(sample.ppyDiscAmt)} ·
                prepayId {String(sample.prepayId)}
                <br />
                priceAfterAllDiscounts {money(sample.priceAfterAllDiscounts)} · tax codes:{" "}
                {sample.taxCodes.length === 0
                  ? "none"
                  : sample.taxCodes.map((c) => `${c.taxCodeId} ${c.taxRate}%`).join(", ")}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">revenueByTaxCodeId</h2>
        {taxCodeCount === 0 && <p>Tax codes have not loaded yet.</p>}
        <table className="tabular-nums">
          <thead>
            <tr className="text-left">
              <th className="pr-6">Tax code</th>
              <th className="pr-6">Revenue</th>
              <th>Tax</th>
            </tr>
          </thead>
          <tbody>
            {taxRows.map(([taxCodeId, summary]) => (
              <tr key={taxCodeId}>
                <td className="pr-6 font-mono">{taxCodeId}</td>
                <td className="pr-6">{money(summary.revenue)}</td>
                <td>{money(summary.taxAmount)}</td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="pr-6">Total tax</td>
              <td className="pr-6" />
              <td>{money(totalTax)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted-foreground">
          Revenue repeats under each of a customer&apos;s tax codes, so it is not summed.
        </p>
      </section>
    </div>
  );
}
