"use client";

import { usePrepayLettersDeps } from "./usePrepayLettersDeps";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { PrepayConfigFileControls } from "./config/_components/PrepayConfigFileControls";
import { UpsellPrioritiesFileControls } from "./upsellPriorities/_components/UpsellPrioritiesFileControls";
import { ListOrdered, Mail, Settings2 } from "lucide-react";
import { usePathname } from "next/navigation";

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

export default function PrepayLettersLayout({ children }: { children: React.ReactNode }) {
  usePrepayLettersDeps();
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
