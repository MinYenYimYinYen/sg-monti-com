"use client";
import { ClipboardList, CheckCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";

export function StartLoadoutCard() {
  const router = useRouter();
  const { setTech } = useLoadoutStartForm();

  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const startedEmployeeIds = useSelector(
    routeDate
      ? loadoutSelect.startedEmployeeIdsByDate(routeDate)
      : () => new Set<string>(),
  );
  const startEmployeesForDate = useSelector(loadoutSelect.startEmployeeIdsForDate(routeDate));

  const handleClick = (employeeId: string) => {
    if (!routeDate) return;
    setTech(employeeId);
    router.push("/scheduling/dailyInventory/loadoutStart");
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Start Loadout</h2>
      </div>
      <p className="text-sm text-foreground/60">
        Enter the starting product amounts loaded onto the truck before heading out on a route.
      </p>

      {!routeDate ? (
        <p className="text-sm text-foreground/40 italic">Select a date to see assigned techs.</p>
      ) : startEmployeesForDate.length === 0 ? (
        <p className="text-sm text-foreground/40 italic">No techs assigned for this date.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mt-1">
          {startEmployeesForDate.map((employeeId) => {
            const isStarted = startedEmployeeIds.has(employeeId);
            return (
              <button
                key={employeeId}
                onClick={() => !isStarted && handleClick(employeeId)}
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
  );
}
