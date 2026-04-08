"use client";
import { use, useEffect } from "react";
import { useSelector } from "react-redux";
import { feedbackSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/feedbackSelect";
import { useLoadoutFeedbackDeps } from "@/app/scheduling/dailyInventory/loadoutFeedback/useLoadoutFeedbackDeps";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

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
  const loadout = useSelector(
    loadoutSelect.getFinishedLoadout({
      employeeId,
      routeDate: routeDate,
    }),
  );

  useEffect(() => {
    if (!employeeId || !routeDate) return;
    getLoadout({ employeeId, routeDate });
  }, [employeeId, getLoadout, routeDate]);

  console.log("completedServices", completedServices);
  console.log("hydratedLoadout", loadout);

  const context = useSelector(centralSelect.context)
  console.log("context", context);

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-foreground/60 text-sm">
        Feedback report for <strong>{employeeId}</strong> on{" "}
        <strong>{routeDate}</strong>
      </p>
      <p className="text-foreground/40 text-xs italic">
        (Check console for completedServices and hydratedLoadout)
      </p>
    </div>
  );
}
