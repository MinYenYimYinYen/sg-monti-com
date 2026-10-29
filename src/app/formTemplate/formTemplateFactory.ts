import type { FormTemplateDoc } from "./FormTemplateTypes";

/**
 * A blank, never-saved template. The empty templateId marks it as unsaved; the server
 * derives the real id (and re-stamps saId) on first save.
 */
export function makeNewTemplate({
  dataType,
  saId,
}: {
  dataType: string;
  saId: string;
}): FormTemplateDoc {
  return {
    templateId: "",
    templateName: "New Template",
    saId,
    dataType,
    pageSize: "LEGAL",
    slots: [],
  };
}
