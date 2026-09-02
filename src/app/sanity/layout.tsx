"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav } from "@/components/PageLayout/TabNav";
import { useSanityDeps } from "./useSanityDeps";
import { SanityOptionsProvider } from "@/app/sanity/_components/SanityOptionsContext";
import { SanityOptionsSheet } from "@/app/sanity/_components/SanityOptionsSheet";

const TABS = [
  { label: "Overview", href: "/sanity" },
  { label: "Program Sanity", href: "/sanity/programSanity" },
  { label: "Customer Sanity", href: "/sanity/customerSanity" },
  { label: "Zero Revenue", href: "/sanity/zeroRevenue" },
  { label: "Size Sanity", href: "/sanity/sizeSanity" },
  { label: "Promise Sanity", href: "/sanity/promiseSanity" },
  { label: "Prenotification", href: "/sanity/prenotification" },
  { label: "Flag Rules", href: "/sanity/flags" },
] as const;

export default function SanityLayout({ children }: { children: React.ReactNode }) {
  useSanityDeps();
  return (
    <SanityOptionsProvider>
      <PageLayout>
        <PageLayout.Header
          left={<span className="text-sm font-semibold">Sanity Checks</span>}
          right={
            <>
              <TabNav items={TABS} rootHref="/sanity" />
              <SanityOptionsSheet />
            </>
          }
        />
        <PageLayout.Body>{children}</PageLayout.Body>
      </PageLayout>
    </SanityOptionsProvider>
  );
}
