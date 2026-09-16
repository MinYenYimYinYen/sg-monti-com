import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { employeeAvailabilityActions } from "@/app/employeeAvailability/employeeAvailabilitySlice";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

export function useEmployeeAvailability({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        employeeAvailabilityActions.getAll({
          params: {},
          config: { loadingMsg: "Loading employee availability..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

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
