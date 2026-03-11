import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { schedPromiseActions } from "@/app/schedPromise/schedPromiseSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useSchedPromise() {
  const dispatch = useAppDispatch();
  const customerDocs = useSelector(centralSelect.customerDocs);
  const programDocs = useSelector(centralSelect.programDocs);
  const serviceDocs = useSelector(centralSelect.serviceDocs);

  useEffect(() => {
    const entities = [
      ...serviceDocs.map((s) => ({
        entityType: "service" as const,
        entityId: s.servId,
        techNote: s.techNote || "",
      })),
      ...programDocs.map((p) => ({
        entityType: "program" as const,
        entityId: p.progId,
        techNote: p.techNote || "",
      })),
      ...customerDocs.map((c) => ({
        entityType: "customer" as const,
        entityId: c.custId,
        techNote: c.techNote || "",
      })),
    ];

    dispatch(
      schedPromiseActions.getSchedPromises({
        params: { entities },
        config: {
          loadingMsg: "Fetching Schedule Promises",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      })
    );
  }, [dispatch, serviceDocs, programDocs, customerDocs]);
}
