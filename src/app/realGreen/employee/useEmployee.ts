import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { employeeActions } from "@/app/realGreen/employee/employeeSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useEmployee({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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
