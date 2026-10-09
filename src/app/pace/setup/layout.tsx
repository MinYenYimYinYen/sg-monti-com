"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";

const SETUP_TABS: readonly TabNavItem[] = [
  { label: "Groups", href: "/pace/setup/groups" },
  { label: "Employees", href: "/pace/setup/employees" },
] as const;

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  // usePaceDeps() is already called in the parent pace layout — do not call again.
  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold text-foreground">Setup</span>}
        right={<TabNav items={SETUP_TABS} rootHref="/pace/setup" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
