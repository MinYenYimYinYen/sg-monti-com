"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { accountSelect } from "@/app/account/accountSelect";
import { useAccount } from "@/app/account/useAccount";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { AccountMappingRow } from "@/app/account/_components/AccountMappingRow";
import { DepositMappingSections } from "@/app/javelin/depositMapping/_components/DepositMappingSections";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import {
  AccountLinkFilter,
  countLinksByFilter,
  filterRgAccountLinks,
} from "@/app/account/_lib/accountMappingView";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";

const filterLabels: Record<AccountLinkFilter, string> = {
  all: "All",
  unmapped: "Unmapped",
  attention: "Needs attention",
};

const filterOrder: AccountLinkFilter[] = ["all", "unmapped", "attention"];
export function AccountMappingPanel() {
  return (
    <GatedPanel requirement={can.accountMappings.read}>
      <AccountMappingEditor />
    </GatedPanel>
  );
}

function AccountMappingEditor() {
  const allows = useSelector(userCapabilitiesSelect.allows);
  // Each load is gated by the capability its route needs, so a user holding only part of what this
  // page uses never fires a request that would be refused.
  useAccount({
    autoLoad: true,
    canLoad: {
      depositLinks: allows(can.depositFieldLinks.read),
      qboAccounts: allows(can.qboAccounts.read),
      qboCustomers: allows(can.qboCustomers.read),
      qboVendors: allows(can.qboVendors.read),
      rgAccounts: allows(can.rgAccounts.read),
    },
  });
  const rgAccountLinks = useSelector(accountSelect.rgAccountLinks);
  const qboAccounts = useSelector(qboAccountSelect.accounts);
  const [filter, setFilter] = useState<AccountLinkFilter>("all");
  const [query, setQuery] = useState("");

  const counts = countLinksByFilter(rgAccountLinks);
  const visibleLinks = filterRgAccountLinks({
    links: rgAccountLinks,
    filter,
    query,
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Link each RealGreen account to the QuickBooks account it posts to.
          Several RealGreen accounts can share one QuickBooks account. Each
          change is saved as soon as you make it.
        </p>

        {qboAccounts.length === 0 && (
          <Alert variant="destructive">
            <AlertTitle>QuickBooks accounts are not loaded</AlertTitle>
            <AlertDescription>
              Existing links cannot be verified yet. If this stays, check the
              QuickBooks connection.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-64 bg-card"
            placeholder="Search number or description..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {filterOrder.map((filterOption) => (
            <Button
              key={filterOption}
              size="sm"
              variant="primary"
              intensity={filter === filterOption ? "solid" : "soft"}
              onClick={() => setFilter(filterOption)}
            >
              {filterLabels[filterOption]} ({counts[filterOption]})
            </Button>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">RG Acct #</TableHead>
              <TableHead className="w-72">RG Description</TableHead>
              <TableHead>QuickBooks Account</TableHead>
              <TableHead className="w-48">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleLinks.map((link) => (
              <AccountMappingRow key={link.rgAccount.rgAccountId} link={link} />
            ))}
          </TableBody>
        </Table>

        {visibleLinks.length === 0 && (
          <p className="text-sm text-muted-foreground">No accounts match.</p>
        )}

        <DepositMappingSections />
      </div>
    </div>
  );
}
