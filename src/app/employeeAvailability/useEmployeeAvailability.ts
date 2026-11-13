import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { employeeAvailabilityActions } from "@/app/employeeAvailability/employeeAvailabilitySlice";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers can omit it.
 */
export function useEmployeeAvailability({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        employeeAvailabilityActions.getAll({
          params: {},
          config: { loadingMsg: "Loading employee availability..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const upsert = (doc: EmployeeAvailability) =>
    dispatch(
      employeeAvailabilityActions.upsert({
        params: { doc },
        config: { force: true },
      }),
    );

  const deleteOne = (employeeId: string) =>
    dispatch(
      employeeAvailabilityActions.deleteOne({
        params: { employeeId },
        config: { force: true },
      }),
    );

  return { upsert, deleteOne };
}
