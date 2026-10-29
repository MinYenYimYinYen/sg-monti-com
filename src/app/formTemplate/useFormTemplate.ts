import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { formTemplateActions } from "./formTemplateSlice";
import type { FormTemplateDoc } from "./FormTemplateTypes";

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

  const saveTemplate = (template: FormTemplateDoc) =>
    dispatch(
      formTemplateActions.upsert({
        params: { template },
        config: { loadingMsg: "Saving template...", force: true },
      }),
    );

  const deleteTemplate = (templateId: string) =>
    dispatch(
      formTemplateActions.deleteOne({
        params: { templateId },
        config: { loadingMsg: "Deleting template...", force: true },
      }),
    );

  return { saveTemplate, deleteTemplate };
}
