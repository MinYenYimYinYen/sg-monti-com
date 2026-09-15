"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, TabNavItem } from "@/components/PageLayout/TabNav";
import { usePriceIncreaseDeps } from "@/app/priceIncrease/usePriceIncreaseDeps";
import { DataIssuesPopover } from "@/app/priceIncrease/results/_components/DataIssuesPopover";
import { TargetSeasonControl } from "@/app/priceIncrease/_components/TargetSeasonControl";
import { ActiveSettingsPanel } from "@/app/priceIncrease/results/_components/ActiveSettingsPanel";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { SlidersHorizontal } from "lucide-react";

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
  const pathname = usePathname();
  const settingsPanelOpen = useSelector(priceIncreaseConfigSelect.settingsPanelOpen);

  usePriceIncreaseDeps();

  // The settings panel is only available on non-config pages.
  // The Config page has its own full settings UI.
  const isConfigPage = pathname.startsWith("/priceIncrease/config");
  const showPanel = settingsPanelOpen && !isConfigPage;

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
            {/* Settings panel toggle — hidden on Config page */}
            {!isConfigPage && (
              <button
                onClick={() => dispatch(priceIncreaseConfigActions.toggleSettingsPanel())}
                title={settingsPanelOpen ? "Hide settings panel" : "Show settings panel"}
                className={`flex items-center justify-center h-7 w-7 rounded transition-colors ${
                  settingsPanelOpen
                    ? "bg-primary/20 text-primary"
                    : "text-foreground/40 hover:text-foreground/70 hover:bg-accent/10"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            )}
            <TargetSeasonControl />
            <DataIssuesPopover />
          </div>
        }
        right={<TabNav items={TABS} rootHref="/priceIncrease/config" />}
      />
      <PageLayout.Body>
        <div className="flex h-full overflow-hidden">
          {/* Collapsible left settings panel */}
          {showPanel && (
            <div className="w-72 shrink-0 border-r border-border overflow-hidden flex flex-col">
              <ActiveSettingsPanel />
            </div>
          )}
          {/* Main content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {children}
          </div>
        </div>
      </PageLayout.Body>
    </PageLayout>
  );
}
