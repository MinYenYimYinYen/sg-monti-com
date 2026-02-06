import { employeeActions } from "@/app/realGreen/employee/employeeSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useEmployee({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        employeeActions.getEmployees({
          params: {},
          config: {
            loadingMsg: "Loading employees...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      employeeActions.getEmployees({
        params: {},
        config: {
          loadingMsg: "Loading employees...",
          force: true,
        },
      }),
    );

  return { refresh };
}
