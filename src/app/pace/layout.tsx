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
import {
  BarChart2,
  CalendarDays,
  ClipboardList,
  GitBranch,
  Map,
  Settings2,
  TrendingDown,
  Users,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: readonly TabNavItem[] = [
  { label: "Employee Plan", href: "/pace", icon: Users },
  { label: "Priorities", href: "/pace/priorities", icon: ClipboardList },
  { label: "Assignments", href: "/pace/assignments", icon: Settings2 },
  { label: "Season Plan", href: "/pace/seasonPlan", icon: Map },
  { label: "Emp Timeline", href: "/pace/empTimeline", icon: CalendarDays },
  { label: "SC Timeline", href: "/pace/scTimeline", icon: GitBranch },
  { label: "Gantt", href: "/pace/gantt", icon: BarChart2 },
  { label: "Burndown", href: "/pace/burndown", icon: TrendingDown },
];

const ROOT_HREF = "/pace";

const selectMainDate = (state: AppState): string => state.pace.mainDate;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function PaceLayout({ children }: { children: React.ReactNode }) {
  usePaceDeps();
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
