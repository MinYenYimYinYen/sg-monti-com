"use client";
import { ClipboardCheck, CheckCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutSelect } from "@/app/loadout/loadoutSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";

export function FinishLoadoutCard() {
  const router = useRouter();
  const { setTech } = useLoadoutStartForm();

  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const loadoutsByDate = useSelector(loadoutSelect.loadoutsByDate(routeDate));
  const finishEmployeesForDate = useSelector(loadoutSelect.finishEmployeeIdsForDate(routeDate));

  const handleFinishClick = (employeeId: string) => {
    if (!routeDate) return;
    setTech(employeeId);
    router.push("/scheduling/dailyInventory/loadoutFinish");
  };

  const handleFeedbackClick = (employeeId: string) => {
    if (!routeDate) return;
    router.push(`/scheduling/dailyInventory/loadoutFeedback/${employeeId}/${routeDate}`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Finish Loadout</h2>
      </div>
      <p className="text-sm text-foreground/60">
        Record the remaining product amounts after completing the route to close out the loadout.
      </p>

      {!routeDate ? (
        <p className="text-sm text-foreground/40 italic">Select a date to see assigned techs.</p>
      ) : finishEmployeesForDate.length === 0 ? (
        <p className="text-sm text-foreground/40 italic">No techs assigned for this date.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mt-1">
          {finishEmployeesForDate.map((employeeId) => {
            const doc = loadoutsByDate.get(employeeId);
            if (!doc) {
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
                  doc.isStored ? handleFeedbackClick(employeeId) : handleFinishClick(employeeId)
                }
                className={
                  doc.isStored
                    ? "flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer"
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
  );
}
