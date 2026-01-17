import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  servCodeActions,
  servCodeSelect,
} from "@/app/realGreen/servCode/servCodeSlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useServCode({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const servCodeMap = useSelector(servCodeSelect.servCodeMap);

  if (autoLoad) {
    dispatch(
      servCodeActions.getServCodes({
        showLoading: true,
        staleTime: realGreenConst.paramTypesCacheTime,
      }),
    );
  }

  const refresh = () =>
    dispatch(
      servCodeActions.getServCodes({
        showLoading: true,
        force: true,
      }),
    );

  const findServCode = (id: string) => servCodeMap.get(id);
  const getServCode = (id: string) => {
    const servCode = servCodeMap.get(id);
    if (!servCode) {
      throw new AppError({
        message: "ServCode not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return servCode;
  };

  return { refresh, findServCode, getServCode };
}
