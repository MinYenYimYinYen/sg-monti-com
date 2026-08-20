"use client";

import { ReactNode, useState } from "react";
import { Users, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { useCustomerValueDeps } from "@/app/bizPlan/customerValue/useCustomerValueDeps";
import { ZipCodeFilter } from "@/app/bizPlan/customerValue/ZipCodeFilter";
import { CustomerJsonPanel } from "@/app/realGreen/customer/json/CustomerJsonPanel";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useMultiSeasonProduction } from "@/app/realGreen/customer/hooks/useMultiSeasonProduction";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";

const NAV_LINKS = [
  { label: "By Zip Code", href: "/bizPlan/customerValue/byZipCode" },
  { label: "By Program", href: "/bizPlan/customerValue/byProgram" },
  { label: "Retention", href: "/bizPlan/customerValue/retention" },
] as const;

const CUSTOMER_VALUE_CONTEXTS = ["active", "multiSeasonProduction"] as const;

function LoadViaApiButton() {
  const [confirming, setConfirming] = useState(false);
  const { refresh: loadActive, canRefresh } = useActiveCustomers();
  const { load: loadMultiSeason, canLoad } = useMultiSeasonProduction();
  const season = useSelector(globalSettingsSelect.season);

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    // Confirmed — dispatch both loads
    loadActive();
    loadMultiSeason();
    setConfirming(false);
  };

  const handleCancel = () => setConfirming(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
        <span className="text-xs text-muted-foreground">
          This will take several minutes. Use Load JSON if you have a recent snapshot.
        </span>
        <Button
          variant="destructive"
          intensity="soft"
          size="sm"
          onClick={handleClick}
          disabled={!canRefresh || !canLoad}
        >
          Confirm
        </Button>
        <Button
          variant="outline"
          intensity="soft"
          size="sm"
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      intensity="soft"
      size="sm"
      onClick={handleClick}
      disabled={!season}
    >
      Load via API
    </Button>
  );
}

export default function CustomerValueLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useCustomerValueDeps();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0 gap-4">
        {/* Left: title + data controls */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-base font-semibold text-foreground">Customer Value</h1>
          </div>
          <CustomerJsonPanel contexts={[...CUSTOMER_VALUE_CONTEXTS]} />
          <LoadViaApiButton />
        </div>

        {/* Right: nav tabs */}
        <div className="flex items-center gap-2 shrink-0">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Button
                key={href}
                variant={isActive ? "primary" : "outline"}
                intensity={isActive ? "solid" : "soft"}
                size="sm"
                asChild
              >
                <Link href={href}>{label}</Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Body: left filter panel + page content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — zip code filter (shared across all sub-pages) */}
        <div className="w-52 shrink-0 border-r border-border bg-card overflow-hidden">
          <ZipCodeFilter />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
