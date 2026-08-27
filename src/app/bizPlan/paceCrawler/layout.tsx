"use client";

import { usePaceCrawlerDeps } from "@/app/bizPlan/paceCrawler/usePaceCrawlerDeps";
import { AssignmentScenarioSelector } from "@/app/bizPlan/paceCrawler/AssignmentScenarioSelector";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { paceCrawlerActions } from "@/app/bizPlan/paceCrawler/paceCrawlerSlice";
import { seasonPlanSelect } from "@/app/bizPlan/seasonPlan/seasonPlanSelect";
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
  Users,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: readonly TabNavItem[] = [
  { label: "Employee Plan", href: "/bizPlan/paceCrawler", icon: Users },
  { label: "Priorities", href: "/bizPlan/paceCrawler/priorities", icon: ClipboardList },
  { label: "Assignments", href: "/bizPlan/paceCrawler/assignments", icon: Settings2 },
  { label: "Season Plan", href: "/bizPlan/paceCrawler/seasonPlan", icon: Map },
  { label: "Emp Timeline", href: "/bizPlan/paceCrawler/empTimeline", icon: CalendarDays },
  { label: "SC Timeline", href: "/bizPlan/paceCrawler/scTimeline", icon: GitBranch },
  { label: "Gantt", href: "/bizPlan/paceCrawler/gantt", icon: BarChart2 },
];

const ROOT_HREF = "/bizPlan/paceCrawler";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function PaceCrawlerLayout({ children }: { children: React.ReactNode }) {
  usePaceCrawlerDeps();
  const dispatch = useAppDispatch();
  const mainDate = useSelector(paceCrawlerSelect.mainDate);
  const activeSeasonPlan = useSelector(seasonPlanSelect.activeSeasonPlan);

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
                if (date) dispatch(paceCrawlerActions.setMainDate(date));
              }}
            />
            <AssignmentScenarioSelector />
          </>
        }
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />

      {/* No-season-plan warning banner */}
      {!activeSeasonPlan && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-secondary/10 border-b border-secondary/30 text-[11px] text-secondary">
          <span>⚠ No active season plan — projected end dates and Gantt plan bands are unavailable.</span>
          <Link
            href="/bizPlan/paceCrawler/seasonPlan"
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
