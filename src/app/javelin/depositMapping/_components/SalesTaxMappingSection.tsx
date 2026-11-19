"use client";

import { useSelector } from "react-redux";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/style/components/table";
import { DepositFieldRow } from "@/app/javelin/depositMapping/_components/DepositFieldRow";
import { depositFieldMappingSelect } from "@/app/javelin/depositMapping/depositFieldMappingSelect";
import { DEPOSIT_LINK_LABELS } from "@/app/javelin/_lib/ckDepositFields";

/**
 * The three accounts the sales tax payment uses. The payment debits the payable account and
 * credits the bank account. The adjustment moves the small difference between what the books held
 * for the month and what was paid, so the payable account ends at zero.
 */
export function SalesTaxMappingSection() {
  const links = useSelector(depositFieldMappingSelect.salesTaxLinks);
  // "unverified" only means QuickBooks accounts have not loaded yet, so it is not a problem.
  const blockedLinks = links.filter(
    (link) => link.status !== "mapped" && link.status !== "unverified",
  );

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Sales tax payment accounts</h2>
      <p className="text-sm text-muted-foreground">
        The payment debits the payable account and credits the bank account. The payable account
        must be a liability without sub-accounts, so its balance can be read.
      </p>
      {blockedLinks.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>The sales tax payment cannot post yet</AlertTitle>
          <AlertDescription>
            Link {blockedLinks.map((link) => DEPOSIT_LINK_LABELS[link.field]).join(", ")} before
            posting a sales tax payment.
          </AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-72">Account</TableHead>
            <TableHead>QuickBooks Account</TableHead>
            <TableHead className="w-48">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => (
            <DepositFieldRow key={link.field} link={link} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
