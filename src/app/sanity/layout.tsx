"use client";

import { useSelector } from "react-redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav } from "@/components/PageLayout/TabNav";
import { useSanityDeps } from "./useSanityDeps";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
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
  const allows = useSelector(userCapabilitiesSelect.allows);
  const { load } = useSanityDeps({
    canLoad: {
      customers: allows(can.customers.read),
      progCodes: allows(can.progCodes.read),
      servCodes: allows(can.servCodes.read),
      flags: allows(can.flags.read),
      flagRules: allows(can.flagRules.read),
      customerFlags: allows(can.customerFlags.read),
      callAheads: allows(can.callAheads.read),
      keywords: allows(can.callAheadKeywords.read),
      globalSettings: allows(can.globalSettings.read),
    },
  });
  return (
    <SanityOptionsProvider>
      <PageLayout>
        <PageLayout.Header
          left={<SanityLoadControls onLoadAction={load} />}
          right={
            <>
              <TabNav items={TABS} rootHref="/sanity" />
              <SanityOptionsSheet />
            </>
          }
        />
        <PageLayout.Body>
          <GatedPanel requirement={can.customers.read}>
            {children}
          </GatedPanel>
        </PageLayout.Body>
      </PageLayout>
    </SanityOptionsProvider>
  );
}
