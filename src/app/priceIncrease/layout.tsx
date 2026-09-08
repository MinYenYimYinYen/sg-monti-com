"use client";

import React from "react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, TabNavItem } from "@/components/PageLayout/TabNav";
import { usePriceIncreaseDeps } from "@/app/priceIncrease/usePriceIncreaseDeps";
import { DataIssuesPopover } from "@/app/priceIncrease/results/_components/DataIssuesPopover";

const TABS: readonly TabNavItem[] = [
  { label: "Config", href: "/priceIncrease/config" },
  { label: "Summary", href: "/priceIncrease/summary" },
  { label: "By Customer", href: "/priceIncrease/byCustomer" },
] as const;

export default function PriceIncreaseLayout({ children }: { children: React.ReactNode }) {
  usePriceIncreaseDeps();

  return (
    <PageLayout>
      <PageLayout.Header
        left={<DataIssuesPopover />}
        right={<TabNav items={TABS} rootHref="/priceIncrease/config" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
