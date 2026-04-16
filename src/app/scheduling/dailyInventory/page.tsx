"use client";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { useLoadout } from "@/app/loadout/useLoadout";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { useLoadoutPageDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutPageDeps";
import { StartLoadoutCard } from "@/app/scheduling/dailyInventory/pageComponents/StartLoadoutCard";
import { FinishLoadoutCard } from "@/app/scheduling/dailyInventory/pageComponents/FinishLoadoutCard";
import { FeedbackHistorySection } from "@/app/scheduling/dailyInventory/pageComponents/FeedbackHistorySection";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { BarChart2, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/style/components/collapsible";

export default function DailyInventoryPage() {
  const { setRouteDate } = useLoadoutStartForm();
  const { getLoadouts } = useLoadout();

  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const availableDates = useSelector(assignmentSelect.availableDates);

  useLoadoutPageDeps({ routeDate });

  const today = dateStrings.today();

  useEffect(() => {
    console.log("Available dates:", availableDates);
    if (availableDates.length && availableDates.includes(today)) {
      setRouteDate(today);
    }
  }, [availableDates, setRouteDate, today]);

  // Fetch existing loadouts for the selected date so we can show which techs already started/finished.
  useEffect(() => {
    if (!routeDate) return;
    getLoadouts({ min: routeDate, max: routeDate });
  }, [routeDate, getLoadouts]);

  const handleDateChange = (dates: string[]) => {
    setRouteDate(dates[0]);
  };

  return (
    <div className="h-full flex flex-col gap-6 max-w-2xl">
      {/* Date Selector */}
      <div className="shrink-0 w-48">
        <MultiSelect
          mode="single"
          value={routeDate ? [routeDate] : []}
          onValueChange={handleDateChange}
          className="bg-secondary/20 rounded-md"
        >
          <MultiSelectTrigger>
            {routeDate ? prettyDate(routeDate, "eee, MMM dd") : "Select Date"}
          </MultiSelectTrigger>
          <MultiSelectContent>
            {availableDates.map((date) => (
              <MultiSelectItem key={date} value={date}>
                {prettyDate(date, "eee, MMM dd")}
              </MultiSelectItem>
            ))}
          </MultiSelectContent>
        </MultiSelect>
      </div>

      <div className="shrink-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StartLoadoutCard />
        <FinishLoadoutCard />
      </div>

      <Collapsible className="flex-1 flex flex-col min-h-0 p-2 border rounded-md">
        <CollapsibleTrigger className="shrink-0 flex items-center gap-2 text-foreground font-semibold text-sm group w-full">
          <BarChart2 className="h-4 w-4" />
          Feedback History
          <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex-1 min-h-0 mt-4 overflow-y-auto">
          <FeedbackHistorySection />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
