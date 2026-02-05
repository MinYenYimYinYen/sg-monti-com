import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { zipCodeActions } from "@/app/realGreen/zipCode/zipCodeSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";

export function useZipCode({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        zipCodeActions.getZipCodes({
          params: {},
          config: {
            loadingMsg: "Loading zip codes...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      zipCodeActions.getZipCodes({
        params: {},
        config: {
          showLoading: true,
          force: true,
        },
      }),
    );

  return { refresh };
}
