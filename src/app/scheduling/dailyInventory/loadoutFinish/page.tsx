"use client";
import { cn, md } from "@/style/utils";
import { ChooseTech } from "@/app/scheduling/dailyInventory/components/header/ChooseTech";
import { ChooseRouteDate } from "@/app/scheduling/dailyInventory/components/header/ChooseRouteDate";
import { LoadoutFinishForm } from "@/app/scheduling/dailyInventory/loadoutFinish/LoadoutFinishForm";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { useLoadoutFormDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutFormDeps";


export default function LoadoutFinishPage() {
  useLoadoutFormDeps();
  const router = useRouter();
  const { getFinishFormLoadout } = useLoadout();

  const tech = useSelector(loadoutStartSelect.tech);
  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const finishLoadoutDoc = useSelector(loadoutSelect.finishLoadout);

  // If state was lost (e.g. page refresh), redirect back to the dashboard.
  useEffect(() => {
    if (!tech || !routeDate) {
      router.replace("/scheduling/dailyInventory");
    }
  }, [tech, routeDate, router]);

  // Fetch the persisted loadout when tech + routeDate are set.
  // LoadoutFinishForm renders null until finishLoadoutDoc is populated.
  useEffect(() => {
    if (!tech || !routeDate) return;
    getFinishFormLoadout({ employeeId: tech, routeDate });
  }, [tech, routeDate, getFinishFormLoadout]);

  return (
    <div className={cn("flex flex-col gap-2 py-1", md("gap-3 py-3"))}>
      <div className="flex flex-row flex-wrap gap-2">
        <div className={cn("flex-1 min-w-0", md("w-48 flex-none"))}>
          <ChooseTech />
        </div>
        <div className={cn("flex-1 min-w-0", md("w-40 flex-none"))}>
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
