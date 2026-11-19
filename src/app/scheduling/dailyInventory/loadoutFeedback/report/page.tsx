"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { DateRangePicker } from "@/components/DateRangePicker";
import { loadoutReportActions } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSlice";
import { loadoutReportSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSelect";
import { useLoadoutReportDeps } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/useLoadoutReportDeps";
import { Layer1DateRangePanel } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/devComponents/Layer1DateRangePanel";
import { Layer2FinishedLoadoutsPanel } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/devComponents/Layer2FinishedLoadoutsPanel";
import { Layer3ServicesPanel } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/devComponents/Layer3ServicesPanel";
import { Layer4EntriesPanel } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/devComponents/Layer4EntriesPanel";
import { ByEmployeePanel } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/devComponents/ByEmployeePanel";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/style/components/tabs";
import { TRange } from "@/lib/primatives/tRange/TRange";

export default function LoadoutReportPage() {
  const dispatch = useAppDispatch();
  const dateRange = useSelector(loadoutReportSelect.dateRange);

  useLoadoutReportDeps();

  const handleDateRangeChange = (value: TRange<string>) => {
    dispatch(loadoutReportActions.setDateRange(value));
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground font-semibold text-lg">Loadout Report</h1>
        <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
      </div>

      <Tabs defaultValue="byEmployee">
        <TabsList>
          <TabsTrigger value="byEmployee">By Employee</TabsTrigger>
          <TabsTrigger value="l1">L1: Date Range</TabsTrigger>
          <TabsTrigger value="l2">L2: Loadouts</TabsTrigger>
          <TabsTrigger value="l3">L3: Services</TabsTrigger>
          <TabsTrigger value="l4">L4: Entries</TabsTrigger>
        </TabsList>
        <TabsContent value="byEmployee" className="pt-4">
          <ByEmployeePanel />
        </TabsContent>
        <TabsContent value="l1" className="pt-4">
          <Layer1DateRangePanel />
        </TabsContent>
        <TabsContent value="l2" className="pt-4">
          <Layer2FinishedLoadoutsPanel />
        </TabsContent>
        <TabsContent value="l3" className="pt-4">
          <Layer3ServicesPanel />
        </TabsContent>
        <TabsContent value="l4" className="pt-4">
          <Layer4EntriesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
