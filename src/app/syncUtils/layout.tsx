"use client";

import { Database, Phone } from "lucide-react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";

const TABS: readonly TabNavItem[] = [
  { label: "Customers", href: "/syncUtils/customers", icon: Database },
  { label: "Call Logs", href: "/syncUtils/callLogs", icon: Phone },
];

const ROOT_HREF = "/syncUtils/customers";

/**
 * No `use<Feature>Deps` hook: unlike other tab-routed features, the sync pages share no
 * Redux data to preload. Each panel owns its own local state.
 */
export default function SyncUtilsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold text-foreground">Sync Utilities</span>}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
