import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// accountMappings.read   -> account getAll
// accountMappings.write  -> account upsert
// accountMappings.delete -> account remove
export const accountCapabilities = createFeatureCapabilities({
  key: "account",
  resources: {
    accountMappings: {
      shape: "collection",
      verbs: ["read", "write", "delete"],
    },
  },
});