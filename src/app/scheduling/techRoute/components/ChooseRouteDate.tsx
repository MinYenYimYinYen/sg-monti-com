import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";

export function ChooseRouteDate() {
  const { setRouteDate } = useTechRoute();
  const routeDate = useSelector(techRouteSelect.routeDate);
  const routeDates = useSelector(techRouteSelect.routeDates);

  const routesByDate = useSelector(techRouteSelect.routesByDate);



}