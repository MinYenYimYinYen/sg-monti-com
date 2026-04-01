"use client";
import { cn, md } from "@/style/utils";
import { ChooseTruck } from "@/app/scheduling/dailyInventory/components/header/ChooseTruck";
import { ChooseRideOn } from "@/app/scheduling/dailyInventory/components/header/ChooseRideOn";
import { LoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/LoadoutStartForm";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

export default function LoadoutStartPage() {
  const router = useRouter();
  const tech = useSelector(loadoutStartSelect.tech);
  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  // If state was lost (e.g. page refresh), redirect back to the dashboard.
  useEffect(() => {
    if (!tech || !routeDate) {
      router.replace("/scheduling/dailyInventory");
    }
  }, [tech, routeDate, router]);

  const techName = tech ? (employeeMap.get(tech)?.name ?? tech) : null;
  const formattedDate = routeDate
    ? prettyDate(routeDate, "eee, MMM dd", { fallback: routeDate })
    : null;

  if (!tech || !routeDate) return null;

  return (
    <div className={cn("flex flex-col gap-2 py-1", md("gap-3 py-3"))}>
      {/* Read-only context display */}
      {(techName || formattedDate) && (
        <div className="flex items-center gap-2 text-foreground/60">
          {techName && (
            <span className={cn("rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary", md("px-3 py-1 text-sm"))}>
              {techName}
            </span>
          )}
          {formattedDate && (
            <span className={cn("rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary", md("px-3 py-1 text-sm"))}>
              {formattedDate}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-row flex-wrap gap-2">
        <div className={cn("flex-1 min-w-0", md("w-36 flex-none"))}>
          <ChooseTruck />
        </div>
        <div className={cn("flex-1 min-w-0", md("w-36 flex-none"))}>
          <ChooseRideOn />
        </div>
      </div>
      <LoadoutStartForm />
    </div>
  );
}
