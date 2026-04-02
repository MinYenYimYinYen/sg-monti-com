import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { getTreeNodes } from "@/app/quickSend/templates/templateSlice";

const STALE_TIME_MS = 10 * 60 * 1000; // 10 minutes — tree data is stable

export function useTemplate({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!autoLoad) return;
    dispatch(
      getTreeNodes({
        params: {},
        config: {
          loadingMsg: "Loading templates...",
          staleTime: STALE_TIME_MS,
        },
      }),
    );
  }, [autoLoad, dispatch]);
}
