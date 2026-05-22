"use client";

import { usePaceCrawlerDeps } from "@/app/bizPlan/paceCrawler/usePaceCrawlerDeps";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/style/components/tabs";
import { NextDateByEmployeePanel } from "@/app/bizPlan/paceCrawler/devComponents/NextDateByEmployeePanel";
import { OpenDateFloorPanel } from "@/app/bizPlan/paceCrawler/devComponents/OpenDateFloorPanel";
import { LookbackPricePanel } from "@/app/bizPlan/paceCrawler/devComponents/LookbackPricePanel";
import { DailyRatePanel } from "@/app/bizPlan/paceCrawler/devComponents/DailyRatePanel";
import { ActivePoolPanel } from "@/app/bizPlan/paceCrawler/devComponents/ActivePoolPanel";
import { CrawlerResultPanel } from "@/app/bizPlan/paceCrawler/devComponents/CrawlerResultPanel";
import { DeltaMapPanel } from "@/app/bizPlan/paceCrawler/devComponents/DeltaMapPanel";
import { AssignmentEditorPanel } from "@/app/bizPlan/paceCrawler/devComponents/AssignmentEditorPanel";
import { EmployeeTimelinePanel } from "@/app/bizPlan/paceCrawler/devComponents/EmployeeTimelinePanel";
import { ServCodeTimelinePanel } from "@/app/bizPlan/paceCrawler/devComponents/ServCodeTimelinePanel";
import { GanttChartPanel } from "@/app/bizPlan/paceCrawler/devComponents/GanttChartPanel";
import { EmployeeCardPanel } from "@/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel";
import { DiffD0OpenServCodesPanel } from "@/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD0OpenServCodesPanel";
import { DiffD1RemainingWeekdaysPanel } from "@/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD1RemainingWeekdaysPanel";
import { DiffD2TeamRatePanel } from "@/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD2TeamRatePanel";
import { DiffD3RequiredRatePanel } from "@/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD3RequiredRatePanel";
import { DiffD4DiffResultPanel } from "@/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD4DiffResultPanel";
import { DiffD5EmployeeCardPanel } from "@/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD5EmployeeCardPanel";

export function PaceCrawlerDev() {
  usePaceCrawlerDeps();

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-foreground">Pace Crawler — Dev</h1>
        <span className="text-[10px] text-muted-foreground bg-accent/10 rounded px-1.5 py-0.5">
          in progress
        </span>
      </div>

      <Tabs defaultValue="nextDate" className="flex-1 min-h-0">
        {/* Row 1 — Simulator dev tabs */}
        <TabsList variant="accent">
          <TabsTrigger value="nextDate" variant="accent">Next Date</TabsTrigger>
          <TabsTrigger value="openFloor" variant="accent">Open Floor</TabsTrigger>
          <TabsTrigger value="lookback" variant="accent">Lookback</TabsTrigger>
          <TabsTrigger value="dailyRate" variant="accent">Daily Rate</TabsTrigger>
          <TabsTrigger value="activePool" variant="accent">Active Pool</TabsTrigger>
          <TabsTrigger value="crawlerResult" variant="accent">Crawl Result</TabsTrigger>
          <TabsTrigger value="deltaMap" variant="accent">Delta Map</TabsTrigger>
          <TabsTrigger value="assignments" variant="accent">Assignments</TabsTrigger>
          <TabsTrigger value="timeline" variant="accent">Timeline</TabsTrigger>
          <TabsTrigger value="scTimeline" variant="accent">SC Timeline</TabsTrigger>
          <TabsTrigger value="gantt" variant="accent">Gantt</TabsTrigger>
          <TabsTrigger value="employeeCardPlan" variant="accent">Employee Plan</TabsTrigger>
        </TabsList>

        {/* Row 2 — DiffChecker dev tabs */}
        <TabsList variant="primary" className="mt-1">
          <TabsTrigger value="diffD0" variant="primary">D0: Open ServCodes</TabsTrigger>
          <TabsTrigger value="diffD1" variant="primary">D1: Remaining Days</TabsTrigger>
          <TabsTrigger value="diffD2" variant="primary">D2: Team Rate</TabsTrigger>
          <TabsTrigger value="diffD3" variant="primary">D3: Required Rate</TabsTrigger>
          <TabsTrigger value="diffD4" variant="primary">D4: Diff Result</TabsTrigger>
          <TabsTrigger value="diffD5" variant="primary">D5: Employee Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="nextDate" className="overflow-auto">
          <NextDateByEmployeePanel />
        </TabsContent>

        <TabsContent value="openFloor" className="overflow-auto">
          <OpenDateFloorPanel />
        </TabsContent>

        <TabsContent value="lookback" className="overflow-auto">
          <LookbackPricePanel />
        </TabsContent>

        <TabsContent value="dailyRate" className="overflow-auto">
          <DailyRatePanel />
        </TabsContent>

        <TabsContent value="activePool" className="overflow-auto">
          <ActivePoolPanel />
        </TabsContent>

        <TabsContent value="crawlerResult" className="overflow-auto">
          <CrawlerResultPanel />
        </TabsContent>

        <TabsContent value="deltaMap" className="overflow-auto">
          <DeltaMapPanel />
        </TabsContent>

        <TabsContent value="assignments" className="overflow-hidden">
          <AssignmentEditorPanel />
        </TabsContent>

        <TabsContent value="timeline" className="overflow-hidden">
          <EmployeeTimelinePanel />
        </TabsContent>

        <TabsContent value="scTimeline" className="overflow-hidden">
          <ServCodeTimelinePanel />
        </TabsContent>

        <TabsContent value="gantt" className="overflow-hidden">
          <GanttChartPanel />
        </TabsContent>

        <TabsContent value="employeeCardPlan" className="overflow-hidden">
          <EmployeeCardPanel />
        </TabsContent>

        <TabsContent value="diffD0" className="overflow-auto">
          <DiffD0OpenServCodesPanel />
        </TabsContent>

        <TabsContent value="diffD1" className="overflow-auto">
          <DiffD1RemainingWeekdaysPanel />
        </TabsContent>

        <TabsContent value="diffD2" className="overflow-auto">
          <DiffD2TeamRatePanel />
        </TabsContent>

        <TabsContent value="diffD3" className="overflow-auto">
          <DiffD3RequiredRatePanel />
        </TabsContent>

        <TabsContent value="diffD4" className="overflow-auto">
          <DiffD4DiffResultPanel />
        </TabsContent>

        <TabsContent value="diffD5" className="overflow-hidden">
          <DiffD5EmployeeCardPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
