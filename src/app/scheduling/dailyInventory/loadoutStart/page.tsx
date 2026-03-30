"use client";
import { cn, md } from "@/style/utils";
import { ChooseTech } from "@/app/scheduling/dailyInventory/components/header/ChooseTech";
import { ChooseRouteDate } from "@/app/scheduling/dailyInventory/components/header/ChooseRouteDate";
import { ChooseTruck } from "@/app/scheduling/dailyInventory/components/header/ChooseTruck";
import { ChooseRideOn } from "@/app/scheduling/dailyInventory/components/header/ChooseRideOn";
import { LoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/LoadoutStartForm";

export default function LoadoutStartPage() {
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
        <div className={"w-36"}>
          <ChooseTruck />
        </div>
        <div className={"w-36"}>
          <ChooseRideOn />
        </div>
      </div>
      <LoadoutStartForm />
    </div>
  );
}
