import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { formTemplateActions } from "./formTemplateSlice";
import type { FormTemplateDoc } from "./FormTemplateTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers in other folders can omit it.
 */
export function useFormTemplate({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        formTemplateActions.getAll({
          params: {},
          config: { loadingMsg: "Loading form templates..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

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
