import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { storedTemplatesActions } from "./storedTemplatesSlice";
import type { StoredTemplateDoc } from "./StoredTemplateTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useStoredTemplates({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        storedTemplatesActions.getTemplates({
          params: {},
          config: {
            loadingMsg: "Loading templates...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
      dispatch(
        storedTemplatesActions.getGroups({
          params: {},
          config: {
            loadingMsg: "Loading groups...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const saveTemplate = (template: StoredTemplateDoc) =>
    dispatch(
      storedTemplatesActions.saveTemplate({
        params: { template },
        config: { loadingMsg: "Saving template...", force: true },
      }),
    );

  const deleteTemplate = (templateId: string) =>
    dispatch(
      storedTemplatesActions.deleteTemplate({
        params: { templateId },
        config: { loadingMsg: "Deleting template...", force: true },
      }),
    );

  const createGroup = (name: string) =>
    dispatch(
      storedTemplatesActions.createGroup({
        params: { name },
        config: { loadingMsg: "Creating group...", force: true },
      }),
    );

  const renameGroup = (groupId: string, newName: string) =>
    dispatch(
      storedTemplatesActions.renameGroup({
        params: { groupId, newName },
        config: { loadingMsg: "Renaming group...", force: true },
      }),
    );

  const deleteGroup = (groupId: string) =>
    dispatch(
      storedTemplatesActions.deleteGroup({
        params: { groupId },
        config: { loadingMsg: "Deleting group...", force: true },
      }),
    );

  const moveTemplate = (templateId: string, groupId: string | null) =>
    dispatch(
      storedTemplatesActions.moveTemplate({
        params: { templateId, groupId },
        config: { loadingMsg: "Moving template...", force: true },
      }),
    );

  return {
    saveTemplate,
    deleteTemplate,
    createGroup,
    renameGroup,
    deleteGroup,
    moveTemplate,
  };
}
