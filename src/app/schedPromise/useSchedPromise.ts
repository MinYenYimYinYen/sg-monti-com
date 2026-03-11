import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { schedPromiseActions } from "@/app/schedPromise/schedPromiseSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { parsePromiseString } from "@/app/schedPromise/parsePromise";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

export function useSchedPromise() {
  const dispatch = useAppDispatch();
  const customerDocs = useSelector(centralSelect.customerDocs);
  const programDocs = useSelector(centralSelect.programDocs);
  const serviceDocs = useSelector(centralSelect.serviceDocs);

  useEffect(() => {
    dispatch(
      schedPromiseActions.getSchedPromises({
        params: {
          serviceIds: serviceDocs.map((s) => s.servId),
          programIds: programDocs.map((p) => p.progId),
          customerIds: customerDocs.map((c) => c.custId),
        },
        config: {
          loadingMsg: "Fetching Schedule Promises",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch, serviceDocs, programDocs, customerDocs]);
}
