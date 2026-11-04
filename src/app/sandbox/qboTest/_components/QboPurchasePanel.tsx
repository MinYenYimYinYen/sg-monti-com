"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import { qboPurchaseSelect } from "@/app/qbo/purchase/qboPurchaseSelect";
import { useQboPurchase } from "@/app/qbo/purchase/useQboPurchase";
import {
  describeExpenseAccounts,
  monthToDateRange,
  validatePurchaseRange,
} from "@/app/qbo/purchase/_lib/qboPurchaseUtils";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// Today's date differs between the server and the browser, so the controls render on the client only.
export function QboPurchasePanel() {
  const isClient = useIsClient();
  if (!isClient) return null;
  return <QboPurchaseBrowser />;
}

function QboPurchaseBrowser() {
  const purchases = useSelector(qboPurchaseSelect.purchases);
  const creditCardPurchases = useSelector(qboPurchaseSelect.creditCardPurchases);
  const creditCardNetTotal = useSelector(qboPurchaseSelect.creditCardNetTotal);
  const loadedRange = useSelector(qboPurchaseSelect.loadedRange);
  const { loadRange } = useQboPurchase();

  const [range, setRange] = useState(() => monthToDateRange(new Date()));
  const problem = validatePurchaseRange({ range, maxDays: qboConst.purchaseMaxRangeDays });

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm text-muted-foreground">
            <span>From</span>
            <Input
              type="date"
              value={range.startDate}
              onChange={(e) => setRange({ ...range, startDate: e.target.value })}
              className="w-44"
            />
          </label>
          <label className="space-y-1 text-sm text-muted-foreground">
            <span>To</span>
            <Input
              type="date"
              value={range.endDate}
              onChange={(e) => setRange({ ...range, endDate: e.target.value })}
              className="w-44"
            />
          </label>
          <Button
            variant="primary"
            intensity="soft"
            disabled={problem !== null}
            onClick={() => loadRange(range)}
          >
            Load from QuickBooks
          </Button>
          {problem && <p className="text-sm text-destructive">{problem}</p>}
        </div>

        <p className="text-sm text-muted-foreground">
          {loadedRange === null
            ? "Nothing loaded yet. Choose a range and load it. Nothing is changed in QuickBooks."
            : `${purchases.length} purchases from ${loadedRange.startDate} to ${loadedRange.endDate}. ${creditCardPurchases.length} on credit cards, net ${formatMoney(creditCardNetTotal)} (charges minus refunds).`}
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10%]">Date</TableHead>
              <TableHead className="w-[10%]">Type</TableHead>
              <TableHead className="w-[10%]">Ref no.</TableHead>
              <TableHead className="w-[16%]">Account</TableHead>
              <TableHead className="w-[18%]">Payee</TableHead>
              <TableHead className="w-[18%]">Expense account</TableHead>
              <TableHead className="w-[10%] text-right">Amount</TableHead>
              <TableHead className="w-[8%]">Id</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((purchase) => (
              <TableRow key={purchase.Id} variant="alternating">
                <TableCell>{purchase.TxnDate ?? ""}</TableCell>
                <TableCell noTruncate>
                  <Badge variant="primary" intensity={purchase.Credit ? "bold" : "ghost"}>
                    {purchase.Credit ? "Refund" : purchase.PaymentType}
                  </Badge>
                </TableCell>
                <TableCell>{purchase.DocNumber ?? ""}</TableCell>
                <TableCell>{purchase.AccountRef.name ?? purchase.AccountRef.value}</TableCell>
                <TableCell>{purchase.EntityRef?.name ?? ""}</TableCell>
                <TableCell>{describeExpenseAccounts(purchase)}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(purchase.Credit ? -purchase.TotalAmt : purchase.TotalAmt)}
                </TableCell>
                <TableCell>{purchase.Id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
