"use client";

import { usePrepayLettersDeps } from "./usePrepayLettersDeps";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { PrepayConfigFileControls } from "./config/_components/PrepayConfigFileControls";
import { UpsellPrioritiesFileControls } from "./upsellPriorities/_components/UpsellPrioritiesFileControls";
import { ListOrdered, Mail, Settings2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { can } from "@/permission/can";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: readonly TabNavItem[] = [
  { label: "Config", href: "/prepayLetters/config", icon: Settings2 },
  { label: "Upsells", href: "/prepayLetters/upsellPriorities", icon: ListOrdered },
  { label: "Renewals", href: "/prepayLetters/renewalLetters", icon: Mail },
];

const ROOT_HREF = "/prepayLetters";
const UPSELL_HREF = "/prepayLetters/upsellPriorities";
const RENEWAL_HREF = "/prepayLetters/renewalLetters";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * The config read is the gate for the whole module (it is the nav entry's capability). The Upsells
 * tab adds its own read on top (see its page). The renewals tab reads configs, upsell lists and
 * form templates, which `requires` lists.
 */
export default function PrepayLettersLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={can.prepayConfigs.read}>
      <PrepayLettersShell>{children}</PrepayLettersShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function PrepayLettersShell({ children }: { children: React.ReactNode }) {
  const allows = useSelector(userCapabilitiesSelect.allows);
  usePrepayLettersDeps({
    canLoad: {
      upsellPriorities: allows(can.upsellPriorities.read),
      formTemplates: allows(can.formTemplates.read),
      globalSettings: allows(can.globalSettings.read),
    },
  });
  const pathname = usePathname();
  const isUpsellTab = pathname.startsWith(UPSELL_HREF);
  const isRenewalTab = pathname.startsWith(RENEWAL_HREF);

  // The renewals tab only displays the active config and upsell list, so it has no file menu.
  const headerLeft = isRenewalTab ? null : isUpsellTab ? (
    <UpsellPrioritiesFileControls />
  ) : (
    <PrepayConfigFileControls />
  );

  return (
    <PageLayout>
      <PageLayout.Header
        left={headerLeft}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
