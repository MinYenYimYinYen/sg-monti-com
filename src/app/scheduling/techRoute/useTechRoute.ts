import { useAppDispatch } from "@/lib/hooks/redux";
import {
  techRouteActions,
} from "@/app/scheduling/techRoute/techRouteSlice";
import { LoadoutBase } from "@/app/realGreen/product/_lib/types/LoadoutTypes";

export function useTechRoute() {
  const dispatch = useAppDispatch();

  const setTech = (tech: string) => {
    dispatch(techRouteActions.setTech(tech));
  }

  const setRouteDate = (date: string) => {
    dispatch(techRouteActions.setRouteDate(date));
  };

  const updateStartLoadout = (loadout: Partial<LoadoutBase>) => {
    dispatch(techRouteActions.updateStartLoadout(loadout));
  }


  return { setRouteDate, setTech, updateStartLoadout };
}
