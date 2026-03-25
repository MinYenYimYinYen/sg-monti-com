"use client";
import { Container } from "@/components/Containers";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useSelector } from "react-redux";
import { useLoadoutFormDeps } from "@/app/scheduling/dailyInventory/_lib/useLoadoutFormDeps";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";

import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { ChooseRouteDate } from "@/app/scheduling/dailyInventory/components/ChooseRouteDate";
import { ChooseTech } from "@/app/scheduling/dailyInventory/components/ChooseTech";
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
            md("flex-row gap-4 w-96 flex-none"),
          )}
        >
          <div className={"w-62 bg-accent/20 rounded-md"}>
            <ChooseTech />
          </div>
          <div className={"w-48 bg-secondary/20 rounded-md"}>
            <ChooseRouteDate />
          </div>
        </div>
        <LoadoutForm />
      </ScrollArea>
    </Container>
  );
}
