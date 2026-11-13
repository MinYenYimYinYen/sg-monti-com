"use client";

import { useSelector } from "react-redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav } from "@/components/PageLayout/TabNav";
import { useSanityDeps } from "./useSanityDeps";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { customerCapabilities } from "@/app/realGreen/customer/customerCapabilities";
import { progServCapabilities } from "@/app/realGreen/progServ/progServCapabilities";
import { flagCapabilities } from "@/app/realGreen/flag/flagCapabilities";
import { flagRuleCapabilities } from "@/app/flagRule/flagRuleCapabilities";
import { custFlagCapabilities } from "@/app/realGreen/custFlag/custFlagCapabilities";
import { callAheadCapabilities } from "@/app/realGreen/callAhead/callAheadCapabilities";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";
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
      customers: allows(customerCapabilities.can.customers.read),
      progCodes: allows(progServCapabilities.can.progCodes.read),
      servCodes: allows(progServCapabilities.can.servCodes.read),
      flags: allows(flagCapabilities.can.flags.read),
      flagRules: allows(flagRuleCapabilities.can.flagRules.read),
      customerFlags: allows(custFlagCapabilities.can.customerFlags.read),
      callAheads: allows(callAheadCapabilities.can.callAheads.read),
      keywords: allows(callAheadCapabilities.can.keywords.read),
      globalSettings: allows(globalSettingsCapabilities.can.settings.read),
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
          <GatedPanel requirement={customerCapabilities.can.customers.read}>
            {children}
          </GatedPanel>
        </PageLayout.Body>
      </PageLayout>
    </SanityOptionsProvider>
  );
}
