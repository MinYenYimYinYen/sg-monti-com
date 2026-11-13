import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { storedTemplatesActions } from "./storedTemplatesSlice";
import type { StoredTemplateDoc } from "./StoredTemplateTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/** Which of the loads this hook fires the caller may make. Absent means allowed, so write-only callers can skip it. */
type CanLoad = {
  templates?: boolean;
  groups?: boolean;
};

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. A load
 * the user may not make is skipped, so a user holding only one of the two reads gets no refused
 * request and no error toast.
 */
export function useStoredTemplates({
  autoLoad,
  canLoad = {},
}: { autoLoad?: boolean; canLoad?: CanLoad } = {}) {
  const { templates: canLoadTemplates = true, groups: canLoadGroups = true } = canLoad;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoadTemplates) {
      dispatch(
        storedTemplatesActions.getTemplates({
          params: {},
          config: {
            loadingMsg: "Loading templates...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
    if (autoLoad && canLoadGroups) {
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
  }, [autoLoad, canLoadTemplates, canLoadGroups, dispatch]);

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
