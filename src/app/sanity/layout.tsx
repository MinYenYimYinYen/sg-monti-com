"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav } from "@/components/PageLayout/TabNav";
import { useSanityDeps } from "./useSanityDeps";
import { SanityOptionsProvider } from "@/app/sanity/_components/SanityOptionsContext";
import { SanityOptionsSheet } from "@/app/sanity/_components/SanityOptionsSheet";
import { SanityLoadControls } from "@/app/sanity/_components/SanityLoadControls";

const TABS = [
  { label: "Overview", href: "/sanity" },
  { label: "Zero Revenue", href: "/sanity/zeroRevenue" },
  { label: "Flag Rules", href: "/sanity/flags" },
  { label: "Customer Sanity", href: "/sanity/customerSanity" },
  { label: "Program Sanity", href: "/sanity/programSanity" },
  { label: "Size Sanity", href: "/sanity/sizeSanity" },
  { label: "Prenotification", href: "/sanity/prenotification" },
  { label: "Promise Sanity", href: "/sanity/promiseSanity" },
] as const;

export default function SanityLayout({ children }: { children: React.ReactNode }) {
  const { load } = useSanityDeps();
  return (
    <SanityOptionsProvider>
      <PageLayout>
        <PageLayout.Header
          left={<SanityLoadControls onLoad={load} />}
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
