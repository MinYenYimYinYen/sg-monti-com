"use client";

import React, { useEffect } from "react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, TabNavItem } from "@/components/PageLayout/TabNav";
import { usePriceIncreaseDeps } from "@/app/priceIncrease/usePriceIncreaseDeps";
import { DataIssuesPopover } from "@/app/priceIncrease/results/_components/DataIssuesPopover";
import { TargetSeasonControl } from "@/app/priceIncrease/_components/TargetSeasonControl";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";

const LOCAL_STORAGE_KEY = "priceIncrease.targetSeason";

type TargetSeasonStorage = {
  season: number;
  expiresAt: string;
};

const TABS: readonly TabNavItem[] = [
  { label: "Config", href: "/priceIncrease/config" },
  { label: "Summary", href: "/priceIncrease/summary" },
  { label: "By Customer", href: "/priceIncrease/byCustomer" },
] as const;

export default function PriceIncreaseLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  usePriceIncreaseDeps();

  // Restore target season override from localStorage on mount.
  // Clears the stored value if it has expired (6-month TTL).
  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;

    try {
      const stored: TargetSeasonStorage = JSON.parse(raw);
      if (new Date(stored.expiresAt) > new Date()) {
        dispatch(priceIncreaseConfigActions.setTargetSeasonOverride(stored.season));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [dispatch]);

  return (
    <PageLayout>
      <PageLayout.Header
        left={
          <div className="flex items-center gap-3">
            <TargetSeasonControl />
            <DataIssuesPopover />
          </div>
        }
        right={<TabNav items={TABS} rootHref="/priceIncrease/config" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
