import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { formTemplateActions } from "./formTemplateSlice";

export function useFormTemplate({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        formTemplateActions.getAll({
          params: {},
          config: { loadingMsg: "Loading form templates..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);
}
