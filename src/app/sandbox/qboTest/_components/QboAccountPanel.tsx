"use client";

import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { useQboAccount } from "@/app/qbo/account/useQboAccount";

export function QboAccountPanel() {
  const accounts = useSelector(qboAccountSelect.accounts);
  const creditCardAccounts = useSelector(qboAccountSelect.creditCardAccounts);
  const expenseAccounts = useSelector(qboAccountSelect.expenseAccounts);
  // The layout already loads accounts. autoLoad is off here so this only supplies refresh.
  const { refresh } = useQboAccount({ autoLoad: false });

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {accounts.length} accounts, {creditCardAccounts.length} credit card,{" "}
            {expenseAccounts.length} expense (by classification). Read from QuickBooks this session.
          </p>
          <Button variant="primary" intensity="soft" onClick={refresh}>
            Reload from QuickBooks
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Name</TableHead>
              <TableHead className="w-[8%]">Number</TableHead>
              <TableHead className="w-[16%]">Type</TableHead>
              <TableHead className="w-[18%]">Sub-type</TableHead>
              <TableHead className="w-[12%]">Classification</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[8%]">Id</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.Id} variant="alternating">
                <TableCell>{account.FullyQualifiedName}</TableCell>
                <TableCell>{account.AcctNum ?? ""}</TableCell>
                <TableCell>{account.AccountType}</TableCell>
                <TableCell>{account.AccountSubType}</TableCell>
                <TableCell>{account.Classification ?? ""}</TableCell>
                <TableCell noTruncate>
                  <Badge
                    variant={account.Active ? "accent" : "destructive"}
                    intensity={account.Active ? "soft" : "ghost"}
                  >
                    {account.Active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{account.Id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
