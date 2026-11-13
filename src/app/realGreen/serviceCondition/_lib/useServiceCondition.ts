import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { serviceConditionActions } from "@/app/realGreen/serviceCondition/_lib/serviceConditionSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function useServiceCondition({
  canLoad = true,
}: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const serviceDocs = useSelector(centralSelect.serviceDocs);
  useEffect(() => {
    if (!canLoad) return;
    dispatch(
      serviceConditionActions.getServiceConditions({
        params: {
          serviceIds: serviceDocs.map((s) => s.servId),
        },
        config: {
          loadingMsg: "Fetching Service Conditions",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [canLoad, dispatch, serviceDocs]);
}
