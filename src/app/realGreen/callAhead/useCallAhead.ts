import { callAheadActions } from "@/app/realGreen/callAhead/callAheadSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CallAheadDocProps } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

/** Which of the loads this hook fires the caller may make. Absent means allowed, so write-only callers can skip it. */
type CanLoad = {
  callAheads?: boolean;
  keywords?: boolean;
};

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. A load
 * the user may not make is skipped, so a user holding only one of the two reads gets no refused
 * request and no error toast.
 */
export function useCallAhead({
  autoLoad,
  canLoad = {},
}: {
  autoLoad: boolean;
  canLoad?: CanLoad;
}) {
  const { callAheads: canLoadCallAheads = true, keywords: canLoadKeywords = true } = canLoad;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoadCallAheads) {
      dispatch(
        callAheadActions.getCallAheads({
          params: {},
          config: {
            loadingMsg: "Loading call aheads...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
    if (autoLoad && canLoadKeywords) {
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
  }, [autoLoad, canLoadCallAheads, canLoadKeywords, dispatch]);

  const refresh = () => {
    if (canLoadCallAheads) {
      dispatch(
        callAheadActions.getCallAheads({
          params: {},
          config: { loadingMsg: "Loading call aheads...", force: true },
        }),
      );
    }
    if (canLoadKeywords) {
      dispatch(
        callAheadActions.getKeywords({
          params: {},
          config: { loadingMsg: "Loading keywords...", force: true },
        }),
      );
    }
  };

  const upsertDocProps = (docProps: CallAheadDocProps) => {
    dispatch(
      callAheadActions.upsertDocProps({
        params: { docProps },
        config: { showLoading: false, force: true},
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

  return { refresh, upsertDocProps, upsertKeyword, deleteKeyword };
}
