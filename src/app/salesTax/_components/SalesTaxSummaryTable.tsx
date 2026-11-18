"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { RealGreenTaxSummary } from "@/app/salesTax/salesTaxTypes";

export const formatMoney = (amount: number) =>
  amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type SalesTaxSummaryRow = {
  rowKey: string;
  label: string;
  summary: RealGreenTaxSummary;
};

/** One row per summary, with the same columns as the RealGreen probe table. */
export function SalesTaxSummaryTable({
  labelHeader,
  summaryRows,
}: {
  labelHeader: string;
  summaryRows: SalesTaxSummaryRow[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          <TableHead className="text-right">Services</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Discount</TableHead>
          <TableHead className="text-right">Prepay discount</TableHead>
          <TableHead className="text-right">Net after discounts</TableHead>
          <TableHead className="text-right">Tax</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaryRows.map(({ rowKey, label, summary }) => (
          <TableRow key={rowKey}>
            <TableCell className="font-mono">{label}</TableCell>
            <TableCell className="text-right tabular-nums">{summary.services.length}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(summary.price)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(summary.discountAmt)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(summary.ppyDiscAmt)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(summary.netAfterAllDiscounts)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(summary.taxAmount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
