"use client";

import { useSelector } from "react-redux";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/style/components/table";
import { DepositFieldRow } from "@/app/javelin/depositMapping/_components/DepositFieldRow";
import { depositFieldMappingSelect } from "@/app/javelin/depositMapping/depositFieldMappingSelect";
import { DEPOSIT_LINK_LABELS } from "@/app/javelin/_lib/ckDepositFields";

/** The six WorkWave deposit fields, linked to QuickBooks accounts like RealGreen accounts are. */
export function DepositFieldMappingSection() {
  const links = useSelector(depositFieldMappingSelect.links);
  // "unverified" only means QuickBooks accounts have not loaded yet, so it is not a problem.
  const blockedLinks = links.filter(
    (link) => link.status !== "mapped" && link.status !== "unverified",
  );

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Credit card deposit fields</h2>
      <p className="text-sm text-muted-foreground">
        Each column of the WorkWave deposit export posts to one QuickBooks account.
      </p>
      {blockedLinks.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Some deposit fields cannot post yet</AlertTitle>
          <AlertDescription>
            A deposit with a nonzero amount in {blockedLinks.map((link) => DEPOSIT_LINK_LABELS[link.field]).join(", ")}{" "}
            is blocked until {blockedLinks.length === 1 ? "that field is" : "those fields are"} linked.
          </AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">Deposit field</TableHead>
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
