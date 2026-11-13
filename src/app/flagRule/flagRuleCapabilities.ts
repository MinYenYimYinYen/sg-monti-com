import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Rules that decide which customers get which flags. The sanity flag screens evaluate them against
// the customers in memory, but the rules and their routes are owned here.
//
// flagRules.read   -> flagRule getAll
// flagRules.write  -> flagRule upsert
// flagRules.delete -> flagRule deleteOne
//
// deleteOne was admin only while upsert was admin and office, so delete stays its own verb and is
// not folded into write.
export const flagRuleCapabilities = createFeatureCapabilities({
  key: "flagRule",
  resources: {
    flagRules: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
