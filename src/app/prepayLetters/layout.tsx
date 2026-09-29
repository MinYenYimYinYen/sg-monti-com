"use client";

import { usePrepayLettersDeps } from "./usePrepayLettersDeps";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { PrepayConfigFileMenu } from "./config/_components/PrepayConfigFileMenu";
import { Settings2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: readonly TabNavItem[] = [
  { label: "Config", href: "/prepayLetters/config", icon: Settings2 },
];

const ROOT_HREF = "/prepayLetters";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function PrepayLettersLayout({ children }: { children: React.ReactNode }) {
  usePrepayLettersDeps();

  return (
    <PageLayout>
      <PageLayout.Header
        left={<PrepayConfigFileMenu />}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
