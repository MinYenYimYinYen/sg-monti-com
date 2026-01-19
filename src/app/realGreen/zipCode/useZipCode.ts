import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  zipCodeActions,
  zipCodeSelect,
} from "@/app/realGreen/zipCode/zipCodeSlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useZipCode({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const zipCodeMap = useSelector(zipCodeSelect.zipCodeMap);

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

  const findZipCode = (zip: string) => zipCodeMap.get(zip);
  const getZipCode = (zip: string) => {
    const zipCode = zipCodeMap.get(zip);
    if (!zipCode) {
      throw new AppError({
        message: "ZipCode not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: zip,
      });
    }
    return zipCode;
  };

  return { refresh, findZipCode, getZipCode };
}
