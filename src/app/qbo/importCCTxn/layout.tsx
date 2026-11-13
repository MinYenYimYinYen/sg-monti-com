"use client";

import { useSelector } from "react-redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { useImportCCTxnDeps } from "@/app/qbo/importCCTxn/useImportCCTxnDeps";
import { quickbooksCapabilities } from "@/app/qbo/quickbooksCapabilities";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";

const { can } = quickbooksCapabilities;
const { can: importCan } = importCCTxnCapabilities;

const TABS: readonly TabNavItem[] = [
  { label: "Import", href: "/qbo/importCCTxn" },
  { label: "Map", href: "/qbo/importCCTxn/map" },
  { label: "Post", href: "/qbo/importCCTxn/post" },
  { label: "Settings", href: "/qbo/importCCTxn/settings" },
];

/**
 * The import read is the gate for the whole module: every tab works on the imported rows. The Map,
 * Post and Settings tabs add their own read on top (see their panels).
 */
export default function ImportCCTxnLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={importCan.importRows.read}>
      <ImportCCTxnShell>{children}</ImportCCTxnShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function ImportCCTxnShell({ children }: { children: React.ReactNode }) {
  const allows = useSelector(userCapabilitiesSelect.allows);
  useImportCCTxnDeps({
    canLoad: {
      qboAccounts: allows(can.accounts.read),
      qboVendors: allows(can.vendors.read),
      qboCustomers: allows(can.customers.read),
      qboEmployees: allows(can.employees.read),
      formatAccounts: allows(importCan.formatAccounts.read),
      cardAssignments: allows(importCan.cardAssignments.read),
      merchantMappings: allows(importCan.merchantMappings.read),
      skipRules: allows(importCan.skipRules.read),
      importRows: allows(importCan.importRows.read),
    },
  });

  return (
    <PageLayout>
      <PageLayout.Header
        left={
          <span className="text-sm font-medium text-foreground">
            Import Credit Card Transactions
          </span>
        }
        right={<TabNav items={TABS} rootHref="/qbo/importCCTxn" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
