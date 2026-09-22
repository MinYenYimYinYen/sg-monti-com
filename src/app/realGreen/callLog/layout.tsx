"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav } from "@/components/PageLayout/TabNav";

const TABS = [
  { label: "Overview", href: "/realGreen/callLog" },
  { label: "Call Log Status", href: "/realGreen/callLog/callLogStatus" },
] as const;

export default function CallLogLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageLayout>
      <PageLayout.Header
        right={<TabNav items={TABS} rootHref="/realGreen/callLog" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
