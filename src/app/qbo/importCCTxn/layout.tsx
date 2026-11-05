"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { useImportCCTxnDeps } from "@/app/qbo/importCCTxn/useImportCCTxnDeps";

const TABS: readonly TabNavItem[] = [
  { label: "Import", href: "/qbo/importCCTxn" },
  { label: "Map", href: "/qbo/importCCTxn/map" },
  { label: "Post", href: "/qbo/importCCTxn/post" },
  { label: "Settings", href: "/qbo/importCCTxn/settings" },
];

export default function ImportCCTxnLayout({ children }: { children: React.ReactNode }) {
  useImportCCTxnDeps();

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
