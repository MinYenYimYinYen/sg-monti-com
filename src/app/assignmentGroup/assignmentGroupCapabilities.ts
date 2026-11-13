import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Groups of service codes that are scheduled together. The pace module has its own copy of this
// route (pace/assignmentGroup) over the same stored groups. It reuses these capabilities, so the
// pace Setup screens and this feature's screen are gated alike.
//
// assignmentGroups.read   -> assignmentGroup getGroups
// assignmentGroups.write  -> assignmentGroup upsertGroup
// assignmentGroups.delete -> assignmentGroup deleteGroup
export const assignmentGroupCapabilities = createFeatureCapabilities({
  key: "assignmentGroup",
  resources: {
    assignmentGroups: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
