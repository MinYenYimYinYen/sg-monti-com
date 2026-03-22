import { useDispatch } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { techRouteActions } from "@/app/scheduling/techRoute/techRouteSlice";

export function useTechRoute() {
  const dispatch = useAppDispatch();

  const setRouteDate = (date: string) => {
    dispatch(techRouteActions.setRouteDate(date));
  };

  return { setRouteDate };
}
