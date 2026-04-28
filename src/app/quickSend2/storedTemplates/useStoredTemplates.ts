import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { storedTemplates2Actions } from "./storedTemplatesSlice";
import type { StoredTemplateDoc } from "./StoredTemplateTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useStoredTemplates({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        storedTemplates2Actions.getTemplates({
          params: {},
          config: {
            loadingMsg: "Loading templates...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
      dispatch(
        storedTemplates2Actions.getGroups({
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
      storedTemplates2Actions.saveTemplate({
        params: { template },
        config: { loadingMsg: "Saving template...", force: true },
      }),
    );

  const deleteTemplate = (templateId: string) =>
    dispatch(
      storedTemplates2Actions.deleteTemplate({
        params: { templateId },
        config: { loadingMsg: "Deleting template...", force: true },
      }),
    );

  const createGroup = (name: string) =>
    dispatch(
      storedTemplates2Actions.createGroup({
        params: { name },
        config: { loadingMsg: "Creating group...", force: true },
      }),
    );

  const renameGroup = (groupId: string, newName: string) =>
    dispatch(
      storedTemplates2Actions.renameGroup({
        params: { groupId, newName },
        config: { loadingMsg: "Renaming group...", force: true },
      }),
    );

  const deleteGroup = (groupId: string) =>
    dispatch(
      storedTemplates2Actions.deleteGroup({
        params: { groupId },
        config: { loadingMsg: "Deleting group...", force: true },
      }),
    );

  const moveTemplate = (templateId: string, groupId: string | null) =>
    dispatch(
      storedTemplates2Actions.moveTemplate({
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
