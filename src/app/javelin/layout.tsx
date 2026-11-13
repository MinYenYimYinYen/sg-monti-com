"use client";

import { CreditCard, FileSpreadsheet, Landmark, Settings2 } from "lucide-react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { useJavelinDeps } from "@/app/javelin/useJavelinDeps";
import { javelinCapabilities } from "@/app/javelin/javelinCapabilities";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";

const ROOT_HREF = "/javelin";

// Settings is last: it is the account mapping every entry is built from.
const TABS: readonly TabNavItem[] = [
  { label: "General Ledger", href: ROOT_HREF, icon: FileSpreadsheet },
  { label: "CC Deposits", href: "/javelin/ccDeposits", icon: CreditCard },
  { label: "CK Deposits", href: "/javelin/ckDeposits", icon: Landmark },
  { label: "Settings", href: "/javelin/settings", icon: Settings2 },
];

const { can } = javelinCapabilities;

/**
 * Every operation behind these pages reads or writes the live books, so the whole shell needs the
 * preview read. That includes the Settings tab, which is the account mapping panel and also checks
 * its own `account` capability.
 */
export default function JavelinLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={can.entryPlans.read}>
      <JavelinShell>{children}</JavelinShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function JavelinShell({ children }: { children: React.ReactNode }) {
  useJavelinDeps();

  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold">Javelin</span>}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
