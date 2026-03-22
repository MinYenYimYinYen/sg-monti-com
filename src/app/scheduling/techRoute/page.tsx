"use client";
import { Container } from "@/components/Containers";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useSelector } from "react-redux";
import { useTechRouteDeps } from "@/app/scheduling/techRoute/useTechRouteDeps";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";

import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";

export default function TechRoute() {
  const techId = "1BT";
  usePrintedCustomers({ autoLoad: true });
  useRecentProduction();
  useTechRouteDeps();

  const techRoutes = useSelector(techRouteSelect.routesByDate);


  return <Container variant={"fluid"}></Container>;
}
