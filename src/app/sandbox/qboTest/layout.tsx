"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { useQboTestDeps } from "@/app/sandbox/qboTest/useQboTestDeps";

// Accounts, Vendors and Purchases are built. Purchases is not loaded by useQboTestDeps: it
// needs a date range, so the tab loads on demand. A new entity from
// qbo/typeReferences/availableReferences.md gets its tab here, built from pasted Intuit definitions.
const TABS: readonly TabNavItem[] = [
  { label: "Accounts", href: "/sandbox/qboTest/account" },
  { label: "Vendors", href: "/sandbox/qboTest/vendor" },
  { label: "Purchases", href: "/sandbox/qboTest/purchase" },
];

const ROOT_HREF = "/sandbox/qboTest";

export default function QboTestLayout({ children }: { children: React.ReactNode }) {
  useQboTestDeps();

  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold text-foreground">QuickBooks Test (live data)</span>}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
