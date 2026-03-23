import { useAppDispatch } from "@/lib/hooks/redux";
import {
  LeftWith,
  techRouteActions,
} from "@/app/scheduling/techRoute/techRouteSlice";

export function useTechRoute() {
  const dispatch = useAppDispatch();

  const setTech = (tech: string) => {
    dispatch(techRouteActions.setTech(tech));
  }

  const setRouteDate = (date: string) => {
    dispatch(techRouteActions.setRouteDate(date));
  };
  
  const toggleLeftWith = (leftWith: LeftWith) => {
    dispatch(techRouteActions.toggleLeftWith(leftWith));
  };

  const updateLeftWith = (leftWith: LeftWith) => {
    dispatch(techRouteActions.updateLeftWith(leftWith));
  };

  const clearLeftWith = () => {
    dispatch(techRouteActions.clearLeftWith());
  };

  return { setRouteDate, setTech, toggleLeftWith, updateLeftWith, clearLeftWith };
}
