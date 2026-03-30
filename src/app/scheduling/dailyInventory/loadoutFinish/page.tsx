"use client";
import { cn, md } from "@/style/utils";
import { ChooseTech } from "@/app/scheduling/dailyInventory/components/header/ChooseTech";
import { ChooseRouteDate } from "@/app/scheduling/dailyInventory/components/header/ChooseRouteDate";
import { LoadoutFinishForm } from "@/app/scheduling/dailyInventory/loadoutFinish/LoadoutFinishForm";
import { useSelector } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { useEffect } from "react";

export default function LoadoutFinishPage() {
  const { getLoadout } = useLoadout();

  const tech = useSelector(loadoutStartSelect.tech);
  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const finishLoadoutDoc = useSelector(loadoutSelect.finishLoadout);

  // Fetch the persisted loadout when tech + routeDate are set.
  // LoadoutFinishForm renders null until finishLoadoutDoc is populated.
  useEffect(() => {
    if (!tech || !routeDate) return;
    getLoadout({ employeeId: tech, routeDate });
  }, [tech, routeDate, getLoadout]);

  return (
    <div className="flex flex-col gap-3 py-3">
      <div
        className={cn(
          "flex flex-col gap-1",
          md("flex-row gap-4 flex-wrap"),
        )}
      >
        <div className={"w-48"}>
          <ChooseTech />
        </div>
        <div className={"w-40"}>
          <ChooseRouteDate />
        </div>
      </div>
      {!tech || !routeDate ? (
        <div className="text-center text-foreground/50 py-8">
          Select a tech and route date to load the finish form.
        </div>
      ) : !finishLoadoutDoc ? (
        <div className="text-center text-foreground/50 py-8">
          No start loadout found for the selected tech and date.
        </div>
      ) : (
        <LoadoutFinishForm />
      )}
    </div>
  );
}
