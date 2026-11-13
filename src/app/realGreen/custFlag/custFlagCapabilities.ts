import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Which RealGreen customers carry which customer flags. Read live from RealGreen, and nothing is
// stored here.
//
// customerFlags.realGreen.read -> realGreen/custFlag loadFlagIdCustIds, refreshCustFlags
//
// flagAssignments.realGreen.write -> realGreen/custFlag/add addCustFlag
//   addCustFlag puts a flag on real customers in RealGreen, and this app has no way to take a flag
//   back off. That is why it has its own capability and is never part of a read-only bundle.
//   Flags drive billing and routing in RealGreen, and the price increase "Assign All" button
//   assigns them in bulk. It was office and admin before the migration, so assign it deliberately.
//
// The flag definitions (the list of flags) live in `realGreen/flag`, which migrates separately.
// Screens that filter by flag need that read too.
export const custFlagCapabilities = createFeatureCapabilities({
  key: "custFlag",
  resources: {
    customerFlags: { shape: "collection", source: "realGreen", verbs: ["read"] },
    flagAssignments: {
      shape: "singleton",
      source: "realGreen",
      verbs: ["write"],
    },
  },
});
