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

export default function PaceCrawlerPage() {
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
      </Tabs>
    </div>
  );
}
