import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Owned by the permission module: who may see and assign capabilities.
//
// bundles: only `read`. Editing bundles is gated by the 'superUser' requirement, which cannot be
//   granted, so nobody can be given bundle-edit rights by mistake.
// userCapabilities: `read` covers listing other users' assignments (the admin UI); `write` covers
//   assigning and removing bundles and direct grants. A user reading their own resolved
//   capabilities needs no capability (getMine verifies the cookie itself).
//
// bundles.read      -> capabilityBundle getAll
// userCapabilities.read  -> userCapabilities getAll
// userCapabilities.write -> assignBundle, removeBundle, addDirect, removeDirect
export const capabilityManagementCapabilities = createFeatureCapabilities({
  key: "capabilityManagement",
  resources: {
    bundles: { shape: "collection", verbs: ["read"] },
    userCapabilities: { shape: "collection", verbs: ["read", "write"] },
  },
});
