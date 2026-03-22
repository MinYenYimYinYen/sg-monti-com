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

export default function TechRoute() {
  const techId = "1BT";
  usePrintedCustomers({ autoLoad: true });
  useRecentProduction();
  useTechRouteDeps();

  const techRoutes = useSelector(techRouteSelect.routesByDate);


  return <Container variant={"fluid"}>
    <ChooseTech />
    <ChooseRouteDate />
  </Container>;
}
