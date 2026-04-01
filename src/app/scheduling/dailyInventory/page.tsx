"use client";
import Link from "next/link";
import { ClipboardList, ClipboardCheck, CalendarSync } from "lucide-react";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";

export default function DailyInventoryPage() {
  const services = useSelector(centralSelect.services);
  const {
    refresh: refreshRecentProduction,
    canRefresh: canRefreshRecentProduction,
  } = useRecentProduction();

  const {
    refresh: refreshPrintedCustomers,
    canRefresh: canRefreshPrintedCustomers,
  } = usePrintedCustomers();

  //todo: get unique dates.  Display date dropdown.
  // set formStart date based on selection

  return (
    <div className="flex flex-col gap-6 py-6 max-w-2xl">
      <p className="text-foreground/70 text-sm">
        Select a task below to get started.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Start Loadout Card */}
        <Link
          href="/scheduling/dailyInventory/loadoutStart"
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Start Loadout
            </h2>
            {canRefreshPrintedCustomers && (
              <CalendarSync
                className={
                  "cursor-pointer hover:text-primary transition-colors bg-primary/30 p-1 rounded-full ml-2 size-8 "
                }
                onClick={() => refreshPrintedCustomers()}
              />
            )}
          </div>
          <p className="text-sm text-foreground/60">
            Enter the starting product amounts loaded onto the truck before
            heading out on a route.
          </p>
          <span className="mt-auto text-sm font-medium text-primary group-hover:underline">
            Enter amounts →
          </span>
        </Link>

        {/* Finish Loadout Card */}
        <Link
          href="/scheduling/dailyInventory/loadoutFinish"
          className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-accent/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Finish Loadout
            </h2>
            {canRefreshRecentProduction && (
              <CalendarSync
                className={
                  "cursor-pointer hover:text-accent transition-colors bg-accent/30 p-1 rounded-full ml-2 size-8 "
                }
                onClick={() => refreshRecentProduction()}
              />
            )}
          </div>
          <p className="text-sm text-foreground/60">
            Record the remaining product amounts after completing the route to
            close out the loadout.
          </p>
          <span className="mt-auto text-sm font-medium text-accent group-hover:underline">
            Enter amounts →
          </span>
        </Link>
      </div>
    </div>
  );
}
