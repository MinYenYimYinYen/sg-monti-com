"use client";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { useLoadoutDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutDeps";
import { StartLoadoutCard } from "@/app/scheduling/dailyInventory/pageComponents/StartLoadoutCard";
import { FinishLoadoutCard } from "@/app/scheduling/dailyInventory/pageComponents/FinishLoadoutCard";
import { FeedbackHistorySection } from "@/app/scheduling/dailyInventory/pageComponents/FeedbackHistorySection";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

export default function DailyInventoryPage() {
  const { setRouteDate } = useLoadoutStartForm();
  const { getLoadouts } = useLoadout();

  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const availableDates = useSelector(assignmentSelect.availableDates);


  // const x = useSelector(loadoutStartSelect.services)
  // const josh = x.filter((s) => {
  //   const assignm
  // })

  useLoadoutDeps({ routeDate });

  const today = dateStrings.today();

  useEffect(() => {
    if (availableDates.includes(today)) {
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
    <div className="flex flex-col gap-6 py-6 max-w-2xl">
      <p className="text-foreground/70 text-sm">Select a task below to get started.</p>

      {/* Date Selector */}
      <div className="w-48">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StartLoadoutCard />
        <FinishLoadoutCard />
      </div>

      <FeedbackHistorySection />
    </div>
  );
}
