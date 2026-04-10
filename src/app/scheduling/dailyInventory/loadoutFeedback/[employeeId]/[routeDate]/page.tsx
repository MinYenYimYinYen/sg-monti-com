"use client";
import { use, useEffect } from "react";
import { useSelector } from "react-redux";
import { feedbackSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/feedbackSelect";
import { useLoadoutFeedbackDeps } from "@/app/scheduling/dailyInventory/loadoutFeedback/useLoadoutFeedbackDeps";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { LoadoutFeedback } from "@/app/scheduling/dailyInventory/loadoutFeedback/LoadoutFeedback";
import { LoadoutFeedbackDisplay } from "@/app/scheduling/dailyInventory/loadoutFeedback/LoadoutFeedbackDisplay";
import { buildLoadoutActuals } from "@/app/scheduling/dailyInventory/loadoutFeedback/loadoutFeedbackHelpers";

// dailyInventory/loadoutFeedback/1BT/2026-04-06
export default function LoadoutFeedbackPage({
  params,
}: {
  params: Promise<{ employeeId: string; routeDate: string }>;
}) {
  const { employeeId, routeDate } = use(params);
  useLoadoutFeedbackDeps({ employeeId, routeDate, showLoading: true });

  const { getLoadout } = useLoadout();

  const completedServices = useSelector(
    feedbackSelect.completedServicesForTech(employeeId, routeDate),
  );
  const scheduledServices = useSelector(
    feedbackSelect.scheduledServicesForTech(employeeId, routeDate),
  );
  const loadout = useSelector(
    loadoutSelect.getFinishedLoadout({ employeeId, routeDate }),
  );

  useEffect(() => {
    if (!employeeId || !routeDate) return;
    getLoadout({ employeeId, routeDate });
  }, [employeeId, getLoadout, routeDate]);

  if (!loadout) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <p className="text-foreground/60 text-sm">
          Feedback report for <strong>{employeeId}</strong> on{" "}
          <strong>{routeDate}</strong>
        </p>
        <p className="text-foreground/40 text-xs italic">
          No finished loadout found for this date.
        </p>
      </div>
    );
  }

  const actuals = buildLoadoutActuals(completedServices, loadout);
  const completedSize = completedServices.reduce((sum, s) => sum + s.size, 0);
  const scheduledSize = scheduledServices.reduce((sum, s) => sum + s.size, 0);
  const feedback = new LoadoutFeedback(
    actuals,
    completedServices.length,
    scheduledServices.length,
    completedSize,
    scheduledSize,
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-foreground/60 text-sm">
        Feedback report for <strong>{employeeId}</strong> on{" "}
        <strong>{routeDate}</strong>
      </p>
      <LoadoutFeedbackDisplay feedback={feedback} />
    </div>
  );
}
