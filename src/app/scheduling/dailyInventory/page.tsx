"use client";
import {
  ClipboardList,
  ClipboardCheck,
  CalendarSync,
  CheckCircle,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { useLoadoutFormDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutFormDeps";

export default function DailyInventoryPage() {
  useLoadoutFormDeps();
  const router = useRouter();
  const { setTech, setRouteDate } = useLoadoutStartForm();
  const { getLoadouts } = useLoadout();

  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const allDates = useSelector(coverSheetsSelect.allDates);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const startedEmployeeIds = useSelector(
    routeDate
      ? loadoutSelect.startedEmployeeIdsByDate(routeDate)
      : () => new Set<string>(),
  );
  const loadoutsByDate = useSelector(loadoutSelect.loadoutsByDate(routeDate));
  const startEmployeesForDate = useSelector(
    loadoutSelect.startEmployeeIdsForDate(routeDate),
  );
  const finishEmployeesForDate = useSelector(
    loadoutSelect.finishEmployeeIdsForDate(routeDate),
  );

  const {
    refresh: refreshPrintedCustomers,
    canRefresh: canRefreshPrintedCustomers,
  } = usePrintedCustomers();

  // Fetch existing loadouts for the selected date so we can show which techs already started/finished.
  useEffect(() => {
    if (!routeDate) return;
    getLoadouts({ min: routeDate, max: routeDate });
  }, [routeDate, getLoadouts]);

  const handleDateChange = (dates: string[]) => {
    setRouteDate(dates[0]);
  };

  const handleStartLoadoutClick = (employeeId: string) => {
    if (!routeDate) return;
    setTech(employeeId);
    router.push("/scheduling/dailyInventory/loadoutStart");
  };

  const handleFinishLoadoutClick = (employeeId: string) => {
    if (!routeDate) return;
    setTech(employeeId);
    router.push("/scheduling/dailyInventory/loadoutFinish");
  };

  return (
    <div className="flex flex-col gap-6 py-6 max-w-2xl">
      <p className="text-foreground/70 text-sm">
        Select a task below to get started.
      </p>

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
            {allDates.map((date) => (
              <MultiSelectItem key={date} value={date}>
                {prettyDate(date, "eee, MMM dd")}
              </MultiSelectItem>
            ))}
          </MultiSelectContent>
        </MultiSelect>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Start Loadout Card */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Start Loadout
            </h2>
            {canRefreshPrintedCustomers && (
              <CalendarSync
                className="cursor-pointer hover:text-primary transition-colors bg-primary/30 p-1 rounded-full ml-2 size-8"
                onClick={() => refreshPrintedCustomers()}
              />
            )}
          </div>
          <p className="text-sm text-foreground/60">
            Enter the starting product amounts loaded onto the truck before
            heading out on a route.
          </p>

          {/* Employee Chips */}
          {!routeDate ? (
            <p className="text-sm text-foreground/40 italic">
              Select a date to see assigned techs.
            </p>
          ) : startEmployeesForDate.length === 0 ? (
            <p className="text-sm text-foreground/40 italic">
              No techs assigned for this date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {startEmployeesForDate.map((employeeId) => {
                const isStarted = startedEmployeeIds.has(employeeId);
                return (
                  <button
                    key={employeeId}
                    onClick={() =>
                      !isStarted && handleStartLoadoutClick(employeeId)
                    }
                    disabled={isStarted}
                    className={
                      isStarted
                        ? "flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent/60 cursor-not-allowed"
                        : "rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    }
                  >
                    {isStarted && <CheckCircle className="h-3.5 w-3.5" />}
                    {employeeMap.get(employeeId)?.name ?? employeeId}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Finish Loadout Card */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Finish Loadout
            </h2>
          </div>
          <p className="text-sm text-foreground/60">
            Record the remaining product amounts after completing the route to
            close out the loadout.
          </p>

          {/* Employee Chips */}
          {!routeDate ? (
            <p className="text-sm text-foreground/40 italic">
              Select a date to see assigned techs.
            </p>
          ) : finishEmployeesForDate.length === 0 ? (
            <p className="text-sm text-foreground/40 italic">
              No techs assigned for this date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {finishEmployeesForDate.map((employeeId) => {
                const doc = loadoutsByDate.get(employeeId);
                if (!doc) {
                  // No loadout started yet — not clickable
                  return (
                    <span
                      key={employeeId}
                      className="rounded-full bg-foreground/5 px-3 py-1 text-sm font-medium text-foreground/30 cursor-not-allowed"
                    >
                      {employeeMap.get(employeeId)?.name ?? employeeId}
                    </span>
                  );
                }

                return (
                  <button
                    key={employeeId}
                    onClick={() =>
                      !doc.isStored && handleFinishLoadoutClick(employeeId)
                    }
                    disabled={doc.isStored}
                    className={
                      doc.isStored
                        ? "flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent/60 cursor-not-allowed"
                        : "rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                    }
                  >
                    {doc.isStored && <CheckCircle className="h-3.5 w-3.5" />}
                    {employeeMap.get(employeeId)?.name ?? employeeId}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
