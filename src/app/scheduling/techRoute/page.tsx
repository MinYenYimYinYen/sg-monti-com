"use client";
import { Container } from "@/components/Containers";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useSelector } from "react-redux";
import { useTechRouteDeps } from "@/app/scheduling/techRoute/useTechRouteDeps";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";

import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import { DatePicker } from "@/components/DatePicker";
import { ChooseRouteDate } from "@/app/scheduling/techRoute/components/ChooseRouteDate";
import { ChooseTech } from "@/app/scheduling/techRoute/components/ChooseTech";
import { cn, md } from "@/style/utils";

export default function TechRoute() {
  const techId = "1BT";
  usePrintedCustomers({ autoLoad: true });
  useRecentProduction();
  useTechRouteDeps();

  const techRoutes = useSelector(techRouteSelect.routesByDate);

  return (
    <Container variant={"fluid"}>
      <div className={"text-2xl font-bold"}>Daily Inventory</div>
      <div className={cn("flex flex-col gap-1",
        md("flex-row gap-4 w-96 flex-none" ))}>
        <div className={"w-62"}>

        <ChooseTech />
        </div>
        <div className={"w-30"}>

        <ChooseRouteDate />
        </div>
      </div>
    </Container>
  );
}
