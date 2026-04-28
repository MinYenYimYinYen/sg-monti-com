import type { ApiContract } from "@/lib/api/types/ApiContract";
import type { DataResponse } from "@/lib/api/types/responses";
import type { StoredTemplateDoc, TemplateGroupDoc } from "./StoredTemplateTypes";

export interface StoredTemplatesContract extends ApiContract {
  /** Fetch all templates visible to the current user. */
  getTemplates: {
    params: Record<string, never>;
    result: DataResponse<StoredTemplateDoc[]>;
  };

  /** Fetch all template groups. */
  getGroups: {
    params: Record<string, never>;
    result: DataResponse<TemplateGroupDoc[]>;
  };

  /**
   * Create or overwrite a template.
   * On overwrite, the caller must be the owner (or admin).
   * `templateId` is generated server-side from `name + saId` if not provided.
   */
  saveTemplate: {
    params: {
      template: StoredTemplateDoc;
    };
    result: DataResponse<StoredTemplateDoc>;
  };

  /** Delete a template. Caller must be the owner or admin. */
  deleteTemplate: {
    params: {
      templateId: string;
    };
    result: DataResponse<null>;
  };

  /** Create a new group. Any authenticated user may create a group. */
  createGroup: {
    params: {
      name: string;
    };
    result: DataResponse<TemplateGroupDoc>;
  };

  /** Rename a group. Admin only. */
  renameGroup: {
    params: {
      groupId: string;
      newName: string;
    };
    result: DataResponse<TemplateGroupDoc>;
  };

  /**
   * Delete a group. Admin only.
   * Does NOT delete templates — caller must resolve each template first
   * (move or delete individually).
   */
  deleteGroup: {
    params: {
      groupId: string;
    };
    result: DataResponse<null>;
  };

  /** Move a template to a different group. Caller must be the owner or admin. */
  moveTemplate: {
    params: {
      templateId: string;
      groupId: string | null;
    };
    result: DataResponse<StoredTemplateDoc>;
  };
}
