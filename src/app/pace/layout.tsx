"use client";

import { usePaceDeps } from "@/app/pace/usePaceDeps";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceActions } from "@/app/pace/paceSlice";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { AppState } from "@/store";
import { DatePicker } from "@/components/DatePicker";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { PaceScenarioSelector } from "@/app/pace/assignmentPlan/PaceScenarioSelector";
import {
  ClipboardList,
  Map,
  Settings2,
  TrendingDown,
  Users,
} from "lucide-react";
import Link from "next/link";
import { paceCapabilities } from "@/app/pace/paceCapabilities";
import { assignmentCapabilities } from "@/app/assignment/assignmentCapabilities";
import { assignmentGroupCapabilities } from "@/app/assignmentGroup/assignmentGroupCapabilities";
import { employeeAvailabilityCapabilities } from "@/app/employeeAvailability/employeeAvailabilityCapabilities";
import { holidayCapabilities } from "@/app/holiday/holidayCapabilities";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: readonly TabNavItem[] = [
  { label: "Route Plan", href: "/pace", icon: Users },
  { label: "Priorities", href: "/pace/priorities", icon: ClipboardList },
  { label: "Burndown", href: "/pace/burndown", icon: TrendingDown },
  { label: "Setup", href: "/pace/setup", icon: Settings2 },
  { label: "Season Plan", href: "/pace/seasonPlan", icon: Map },
];

const ROOT_HREF = "/pace";

const selectMainDate = (state: AppState): string => state.pace.mainDate;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const { can } = paceCapabilities;

/**
 * The scenario read is the gate for the whole shell: the header selector, the engine and every
 * tab depend on the scenarios. The Season Plan tab adds its own read on top (see its page).
 */
export default function PaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={can.assignmentScenarios.read}>
      <PaceShell>{children}</PaceShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function PaceShell({ children }: { children: React.ReactNode }) {
  const allows = useSelector(userCapabilitiesSelect.allows);
  // Each load is gated by the capability its route needs, so a user holding only part of what the
  // engine uses never fires a request that would be refused.
  usePaceDeps({
    canLoad: {
      assignmentGroups: allows(assignmentGroupCapabilities.can.assignmentGroups.read),
      groupSequences: allows(can.groupSequences.read),
      seasonPlans: allows(can.seasonPlans.read),
      holidays: allows(holidayCapabilities.can.holidays.read),
      availability: allows(employeeAvailabilityCapabilities.can.availabilityConstraints.read),
      assignments: allows(assignmentCapabilities.can.serviceAssignments.read),
    },
  });
  const dispatch = useAppDispatch();
  const mainDate = useSelector(selectMainDate);
  const activeSeasonPlan = useSelector(paceSeasonPlanSelect.activeSeasonPlan);

  return (
    <PageLayout>
      <PageLayout.Header
        left={
          <>
            <span className="text-xs text-muted-foreground">As of</span>
            <DatePicker
              className="w-36"
              size="sm"
              value={mainDate}
              onChange={(date) => {
                if (date) dispatch(paceActions.setMainDate(date));
              }}
            />
            <PaceScenarioSelector />
          </>
        }
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />

      {/* No-season-plan warning banner */}
      {!activeSeasonPlan && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-secondary/10 border-b border-secondary/30 text-[11px] text-secondary">
          <span>⚠ No active season plan — projected end dates and Gantt plan bands are unavailable.</span>
          <Link
            href="/pace/seasonPlan"
            className="font-semibold underline hover:text-secondary/80 transition-colors shrink-0"
          >
            Create a season plan →
          </Link>
        </div>
      )}

      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
