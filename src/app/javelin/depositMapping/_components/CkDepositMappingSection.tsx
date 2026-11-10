"use client";

import { useSelector } from "react-redux";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/style/components/table";
import { DepositFieldRow } from "@/app/javelin/depositMapping/_components/DepositFieldRow";
import { depositFieldMappingSelect } from "@/app/javelin/depositMapping/depositFieldMappingSelect";
import { DEPOSIT_LINK_LABELS } from "@/app/javelin/_lib/ckDepositFields";

/**
 * The two accounts a check deposit moves money between: it debits the checking deposit account
 * and credits the RealGreen check holding account. They are not WorkWave export columns.
 */
export function CkDepositMappingSection() {
  const links = useSelector(depositFieldMappingSelect.ckLinks);
  // "unverified" only means QuickBooks accounts have not loaded yet, so it is not a problem.
  const blockedLinks = links.filter(
    (link) => link.status !== "mapped" && link.status !== "unverified",
  );

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Check deposit accounts</h2>
      <p className="text-sm text-muted-foreground">
        A check deposit debits the checking deposit account and credits the RealGreen check
        holding account, moving the money from staged to deposited.
      </p>
      {blockedLinks.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Check deposits cannot post yet</AlertTitle>
          <AlertDescription>
            Link {blockedLinks.map((link) => DEPOSIT_LINK_LABELS[link.field]).join(" and ")} before
            posting a check deposit.
          </AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">Account</TableHead>
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
