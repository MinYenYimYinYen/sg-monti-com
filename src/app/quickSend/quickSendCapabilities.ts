import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";

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
//
// requires: `storedTemplates.read` is the entry capability for the screen (nav entry and page).
// The Open menu files templates under their groups, and the preview needs the current season, so
// reading the screen needs the group read and the global settings read. The RealGreen data the
// screen also loads (customers, programs and services, price tables, prepay, zip codes) is not
// declared yet (deferred).
export const quickSendCapabilities = createFeatureCapabilities({
  key: "quickSend",
  resources: {
    storedTemplates: { shape: "collection", verbs: ["read", "write", "delete"] },
    templateGroups: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
  requires: {
    "storedTemplates.read": [
      "quickSend.templateGroups.read",
      globalSettingsCapabilities.can.settings.read,
    ],
  },
});
