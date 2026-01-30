import { AppDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { conditionActions } from "./conditionSlice";
import { realGreenConst } from "../_lib/realGreenConst";

export function useCondition({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

  if (autoLoad) {
    dispatch(
      conditionActions.getConditionDocs({
        params: {},
        config: {
          loadingMsg: "Loading conditions...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }

  const refresh = () =>
    dispatch(
      conditionActions.getConditionDocs({
        params: {},
        config: {
          loadingMsg: "Loading conditions...",
          force: true,
        },
      }),
    );

  return { refresh };
}
