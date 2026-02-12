import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  centralCustomerActions,
  CustomerContextMode,
} from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

export function useCustomerContext({
  contexts,
}: {
  contexts: CustomerContextMode[];
}) {
  const dispatch = useAppDispatch();
  const activeContexts = useSelector(centralSelect.context);


  // Declarative: Set contexts on mount/change
  useEffect(() => {
    dispatch(centralCustomerActions.switchContexts(contexts));
  }, [dispatch, contexts]);

  // Imperative: Methods for dynamic changes
  const setContexts = (modes: CustomerContextMode[]) => {
    dispatch(centralCustomerActions.switchContexts(modes));
  };

  const toggleContext = (mode: CustomerContextMode) => {
    const newContexts = activeContexts.includes(mode)
      ? activeContexts.filter((c) => c !== mode)
      : [...activeContexts, mode];
    dispatch(centralCustomerActions.switchContexts(newContexts));
  };

  return { setContexts, toggleContext, activeContexts };
}
