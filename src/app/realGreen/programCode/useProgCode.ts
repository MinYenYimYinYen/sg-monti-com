import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  progCodeActions,
  progCodeSelect,
} from "@/app/realGreen/programCode/progCodeSlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useProgCode({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const progCodeMap = useSelector(progCodeSelect.progCodeMap);

  if (autoLoad) {
    dispatch(
      progCodeActions.getProgCodes({
        showLoading: true,
        staleTime: realGreenConst.paramTypesCacheTime,
      }),
    );
  }

  const refresh = () =>
    dispatch(
      progCodeActions.getProgCodes({
        showLoading: true,
        force: true,
      }),
    );

  const findProgCode = (id: string) => progCodeMap.get(id);
  const getProgCode = (id: string) => {
    const progCode = progCodeMap.get(id);
    if (!progCode) {
      throw new AppError({
        message: "ProgCode not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return progCode;
  };

  return { refresh, findProgCode, getProgCode };
}
