import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { serviceConditionActions } from "@/app/realGreen/serviceCondition/_lib/serviceConditionSlice";

export function useServiceCondition() {
  const dispatch = useAppDispatch();
  const serviceDocs = useSelector(centralSelect.serviceDocs)
  useEffect(() => {
    dispatch(serviceConditionActions.getServiceConditions({
      params: {
        serviceIds: serviceDocs.map(s => s.servId)
      },
      config: {
        force: true,
        loadingMsg: "Fetching Service Conditions",
      }
    }))
  }, [dispatch, serviceDocs]);
}