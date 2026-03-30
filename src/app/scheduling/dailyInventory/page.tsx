"use client";
import { Container } from "@/components/Containers";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useLoadoutFormDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutFormDeps";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";

import { ChooseRouteDate } from "@/app/scheduling/dailyInventory/components/header/ChooseRouteDate";
import { ChooseTech } from "@/app/scheduling/dailyInventory/components/header/ChooseTech";
import { ChooseTruck } from "@/app/scheduling/dailyInventory/components/header/ChooseTruck";
import { ChooseRideOn } from "@/app/scheduling/dailyInventory/components/header/ChooseRideOn";
import { cn, md } from "@/style/utils";
import { LoadoutForm } from "@/app/scheduling/dailyInventory/components/LoadoutForm";
import { LoadoutFinishForm } from "@/app/scheduling/dailyInventory/components/LoadoutFinishForm";
import { ScrollArea } from "@/style/components/scroll-area";
import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { useLoadout } from "@/app/scheduling/dailyInventory/_lib/useLoadout";
import { useEffect } from "react";

export default function TechRoute() {
  usePrintedCustomers({ autoLoad: true });
  useRecentProduction();
  useLoadoutFormDeps();

  const { getLoadout } = useLoadout();

  const tech = useSelector(loadoutFormSelect.tech);
  const routeDate = useSelector(loadoutFormSelect.routeDate);
  const finishLoadoutDoc = useSelector(loadoutSelect.finishLoadout);

  // When tech + routeDate are both set, fetch the persisted loadout.
  // If one exists, finishLoadoutDoc will be populated and we show the finish form.
  useEffect(() => {
    if (!tech || !routeDate) return;
    getLoadout({ employeeId: tech, routeDate });
  }, [tech, routeDate, getLoadout]);

  // Show finish form if a persisted loadout exists for the current tech + routeDate
  const showFinishForm =
    !!finishLoadoutDoc &&
    finishLoadoutDoc.employeeId === tech &&
    finishLoadoutDoc.routeDate === routeDate;

  return (
    <Container
      variant={"fluid"}
      className="flex flex-col h-full overflow-hidden"
    >
      <div className={"text-2xl font-bold"}>Daily Inventory</div>
      <ScrollArea className="flex-1 space-y-1">
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
          {!showFinishForm && (
            <>
              <div className={"w-36"}>
                <ChooseTruck />
              </div>
              <div className={"w-36"}>
                <ChooseRideOn />
              </div>
            </>
          )}
        </div>
        {showFinishForm ? <LoadoutFinishForm /> : <LoadoutForm />}
      </ScrollArea>
    </Container>
  );
}
