import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import { flagActions, flagSelect } from "@/app/realGreen/flag/flagSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useFlag({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const flagMap = useSelector(flagSelect.flagMap);

  if (autoLoad) {
    dispatch(
      flagActions.getFlags({
        params: {},
        config: {
          loadingMsg: "Loading flags...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }

  const refresh = () =>
    dispatch(
      flagActions.getFlags({
        params: {},
        config: {
          loadingMsg: "Loading flags...",
          force: true,
        },
      }),
    );

  const findFlag = (id: number) => flagMap.get(id);
  const getFlag = (id: number) => {
    const flag = flagMap.get(id);
    if (!flag) {
      throw new AppError({
        message: "Flag not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return flag;
  };

  return { refresh, findFlag, getFlag };
}
