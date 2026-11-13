import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Stored form templates: positioned slots on a preprinted form, shared by every user.
//
// formTemplates.read   -> formTemplate getAll
// formTemplates.write  -> formTemplate upsert
// formTemplates.delete -> formTemplate deleteOne
//
// Ownership is a separate rule from access: the route still refuses a save or delete that would
// touch another user's template (saId is derived server-side, delete checks the owner). Holding
// `write` or `delete` lets a user change their own templates, never someone else's.
//
// No `requires`: the template editor reads only the static form data type registry, which is
// in-code and has no capability of its own.
export const formTemplateCapabilities = createFeatureCapabilities({
  key: "formTemplate",
  resources: {
    formTemplates: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
