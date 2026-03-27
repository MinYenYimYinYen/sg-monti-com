"use client";
import { Container } from "@/components/Containers";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useLoadoutFormDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutFormDeps";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";

import { ChooseRouteDate } from "@/app/scheduling/dailyInventory/components/ChooseRouteDate";
import { ChooseTech } from "@/app/scheduling/dailyInventory/components/ChooseTech";
import { ChooseTruck } from "@/app/scheduling/dailyInventory/components/ChooseTruck";
import { ChooseRideOn } from "@/app/scheduling/dailyInventory/components/ChooseRideOn";
import { cn, md } from "@/style/utils";
import { LoadoutForm } from "@/app/scheduling/dailyInventory/components/LoadoutForm";
import { ScrollArea } from "@/style/components/scroll-area";

export default function TechRoute() {
  usePrintedCustomers({ autoLoad: true });
  useRecentProduction();
  useLoadoutFormDeps();

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
          <div className={"w-36"}>
            <ChooseTruck />
          </div>
          <div className={"w-36"}>
            <ChooseRideOn />
          </div>
        </div>
        <LoadoutForm />
      </ScrollArea>
    </Container>
  );
}
