"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav } from "@/components/PageLayout/TabNav";
import { useSanityDeps } from "./useSanityDeps";

const TABS = [
  { label: "Overview", href: "/sanity" },
  { label: "Flag Rules", href: "/sanity/flags" },
] as const;

export default function SanityLayout({ children }: { children: React.ReactNode }) {
  useSanityDeps();
  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold">Sanity Checks</span>}
        right={<TabNav items={TABS} rootHref="/sanity" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
