"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, TabNavItem } from "@/components/PageLayout/TabNav";
import { usePriceIncreaseDeps } from "@/app/priceIncrease/usePriceIncreaseDeps";
import { DataIssuesPopover } from "@/app/priceIncrease/results/_components/DataIssuesPopover";
import {
  SeasonControl,
  PRICE_INCREASE_SEASON_KEY,
  PRICE_INCREASE_SEASON_SOURCE_KEY,
  SEASON_EXPIRY_MONTHS,
} from "@/app/priceIncrease/_components/SeasonControl";
import { ActiveSettingsPanel } from "@/app/priceIncrease/results/_components/ActiveSettingsPanel";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { SlidersHorizontal } from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { priceIncreaseCapabilities } from "@/app/priceIncrease/priceIncreaseCapabilities";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

const { can } = priceIncreaseCapabilities;

const TABS: readonly TabNavItem[] = [
  { label: "Config", href: "/priceIncrease/config" },
  { label: "Summary", href: "/priceIncrease/summary" },
  { label: "By Customer", href: "/priceIncrease/byCustomer" },
] as const;

/**
 * The settings read is the gate for the whole module: the active settings drive every tab, and the
 * Config tab is where they are managed. The plans and the global settings are loaded behind their
 * own flags (see `requires`).
 */
export default function PriceIncreaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={can.increaseSettings.read}>
      <PriceIncreaseShell>{children}</PriceIncreaseShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function PriceIncreaseShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const settingsPanelOpen = useSelector(priceIncreaseConfigSelect.settingsPanelOpen);
  const allows = useSelector(userCapabilitiesSelect.allows);

  usePriceIncreaseDeps({
    canLoad: {
      increasePlans: allows(can.increasePlans.read),
      globalSettings: allows(globalSettingsCapabilities.can.settings.read),
    },
  });

  // Restore season overrides from localStorage on mount (6-month TTL). Dispatching
  // always (even with nulls) opens the gate the customer loader waits on, so it never
  // fetches the wrong source season first. A stale target is normalized by the selector.
  const { value: storedTarget } = useLocalStorage<number>(PRICE_INCREASE_SEASON_KEY, {
    expiryMonths: SEASON_EXPIRY_MONTHS,
  });
  const { value: storedSource } = useLocalStorage<number>(PRICE_INCREASE_SEASON_SOURCE_KEY, {
    expiryMonths: SEASON_EXPIRY_MONTHS,
  });
  React.useEffect(() => {
    dispatch(priceIncreaseConfigActions.restoreSeasonOverrides({
      seasonSourceOverride: storedSource,
      targetSeasonOverride: storedTarget,
    }));
  }, [dispatch, storedSource, storedTarget]);

  // The settings panel is only available on non-config pages.
  // The Config page has its own full settings UI.
  const isConfigPage = pathname.startsWith("/priceIncrease/config");
  const showPanel = settingsPanelOpen && !isConfigPage;

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
            <SeasonControl />
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
