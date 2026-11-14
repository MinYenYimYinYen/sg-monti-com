"use client";

import { useSelector } from "react-redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { useImportCCTxnDeps } from "@/app/qbo/importCCTxn/useImportCCTxnDeps";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";

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
    <GatedPanel requirement={can.ccImportRows.read}>
      <ImportCCTxnShell>{children}</ImportCCTxnShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function ImportCCTxnShell({ children }: { children: React.ReactNode }) {
  const allows = useSelector(userCapabilitiesSelect.allows);
  useImportCCTxnDeps({
    canLoad: {
      qboAccounts: allows(can.qboAccounts.read),
      qboVendors: allows(can.qboVendors.read),
      qboCustomers: allows(can.qboCustomers.read),
      qboEmployees: allows(can.qboEmployees.read),
      formatAccounts: allows(can.ccFormatAccounts.read),
      cardAssignments: allows(can.ccCardAssignments.read),
      merchantMappings: allows(can.ccMerchantMappings.read),
      skipRules: allows(can.ccSkipRules.read),
      importRows: allows(can.ccImportRows.read),
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
