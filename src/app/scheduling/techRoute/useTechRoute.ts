import { useAppDispatch } from "@/lib/hooks/redux";
import { techRouteActions } from "@/app/scheduling/techRoute/techRouteSlice";

export function useTechRoute() {
  const dispatch = useAppDispatch();

  const setTech = (tech: string) => {
    dispatch(techRouteActions.setTech(tech));
  }

  const setRouteDate = (date: string) => {
    dispatch(techRouteActions.setRouteDate(date));
  };

  return { setRouteDate, setTech };
}
