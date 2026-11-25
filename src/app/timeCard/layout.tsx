"use client";

import { ReactNode } from "react";
import { BarChart3, Clock, Upload, Wallet } from "lucide-react";
import { useSelector } from "react-redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { timeCardSelect } from "@/app/timeCard/timeCardSelect";
import { useTimeCardDeps } from "@/app/timeCard/useTimeCardDeps";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";

const TABS: readonly TabNavItem[] = [
  { label: "Import", href: "/timeCard/import", icon: Upload },
  { label: "Payroll", href: "/timeCard/payroll", icon: Wallet },
  { label: "Reports", href: "/timeCard/reports", icon: BarChart3 },
];

const ROOT_HREF = "/timeCard/import";

export default function TimeCardLayout({ children }: { children: ReactNode }) {
  useTimeCardDeps();
  const lastImportedDate = useSelector(timeCardSelect.lastImportedDate);

  const lastImportedLabel = lastImportedDate
    ? `Last Imported: ${prettyDate(lastImportedDate, "MMM d yyyy")}`
    : null;

  return (
    <PageLayout>
      <PageLayout.Header
        left={
          <>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-base font-semibold text-foreground">Time Cards</h1>
            {lastImportedLabel && (
              <span className="text-sm text-muted-foreground">{lastImportedLabel}</span>
            )}
          </>
        }
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>
        <GatedPanel requirement={can.punches.read}>{children}</GatedPanel>
      </PageLayout.Body>
    </PageLayout>
  );
}
