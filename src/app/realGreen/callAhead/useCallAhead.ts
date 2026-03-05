import { callAheadActions } from "@/app/realGreen/callAhead/callAheadSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useCallAhead({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        callAheadActions.getCallAheads({
          params: {},
          config: {
            loadingMsg: "Loading call aheads...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
      dispatch(
        callAheadActions.getKeywords({
          params: {},
          config: {
            loadingMsg: "Loading keywords...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () => {
    dispatch(
      callAheadActions.getCallAheads({
        params: {},
        config: { loadingMsg: "Loading call aheads...", force: true },
      }),
    );
    dispatch(
      callAheadActions.getKeywords({
        params: {},
        config: { loadingMsg: "Loading keywords...", force: true },
      }),
    );
  };

  const upsertKeyword = (keywordId: string, message: string) => {
    dispatch(
      callAheadActions.upsertKeyword({
        params: { keyword: { keywordId, message } },
        config: { showLoading: false, force: true },
      }),
    );
  };

  const deleteKeyword = (keywordId: string) => {
    dispatch(
      callAheadActions.deleteKeyword({
        params: { keywordId },
        config: { showLoading: false, force: true },
      }),
    );
  };

  return { refresh, upsertKeyword, deleteKeyword };
}
