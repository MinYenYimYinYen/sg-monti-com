"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, TabNavItem } from "@/components/PageLayout/TabNav";
import { useDeps } from "@/app/sandbox/corruptedRecords/useDeps";
import { corruptedSyncRecordSelect } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSelect";
import { corruptedSyncRecordActions } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSlice";

const TABS: TabNavItem[] = [
  { label: "ServId Context",            href: "/sandbox/corruptedRecords/servIdContext" },
  { label: "Employee Corrupted?",       href: "/sandbox/corruptedRecords/employeeCorrupted" },
  { label: "Programs Without Services", href: "/sandbox/corruptedRecords/programsWithoutServices" },
  { label: "Active Customers",          href: "/sandbox/corruptedRecords/activeCustomers" },
];

const ROOT_HREF = "/sandbox/corruptedRecords";

const SEASON_OPTIONS = [2024, 2025, 2026, 2027];

export default function CorruptedRecordsLayout({ children }: { children: React.ReactNode }) {
  useDeps();

  const dispatch = useAppDispatch();
  const selectedSeason = useSelector(corruptedSyncRecordSelect.selectedSeason);

  return (
    <PageLayout>
      <PageLayout.Header
        left={
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Corrupted Records</span>
            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-xs text-foreground/60">Season:</span>
              <select
                value={selectedSeason}
                onChange={(e) => dispatch(corruptedSyncRecordActions.setSelectedSeason(Number(e.target.value)))}
                className="text-xs bg-card border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {SEASON_OPTIONS.map((season) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>
          </div>
        }
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
