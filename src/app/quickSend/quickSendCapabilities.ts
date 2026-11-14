import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// QuickSend's stored templates and the groups they are filed under. Both are shared by every user.
//
// storedTemplates.read    -> storedTemplates getTemplates
// storedTemplates.write   -> storedTemplates saveTemplate, moveTemplate
// storedTemplates.delete  -> storedTemplates deleteTemplate
// templateGroups.read     -> storedTemplates getGroups
// templateGroups.write    -> storedTemplates createGroup, renameGroup
// templateGroups.delete   -> storedTemplates deleteGroup
//
// Ownership is a separate rule from access, as in formTemplate: saveTemplate derives the id and
// saId from the caller, and deleteTemplate and moveTemplate refuse a template the caller does not
// own. The one override is the superuser (it was the admin role before).
export const quickSendCapabilities = createFeatureCapabilities({
  key: "quickSend",
  resources: {
    storedTemplates: { shape: "collection", verbs: ["read", "write", "delete"] },
    templateGroups: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
