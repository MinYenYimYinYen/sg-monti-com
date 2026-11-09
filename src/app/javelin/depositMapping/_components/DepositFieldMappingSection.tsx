"use client";

import { useSelector } from "react-redux";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/style/components/table";
import { DepositFieldRow } from "@/app/javelin/depositMapping/_components/DepositFieldRow";
import { depositFieldMappingSelect } from "@/app/javelin/depositMapping/depositFieldMappingSelect";

/** The six WorkWave deposit fields, linked to QuickBooks accounts like RealGreen accounts are. */
export function DepositFieldMappingSection() {
  const links = useSelector(depositFieldMappingSelect.links);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Credit card deposit fields</h2>
      <p className="text-sm text-muted-foreground">
        Each column of the WorkWave deposit export posts to one QuickBooks account.
      </p>
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
