import { createFeatureCapabilities } from "@/permission/PermissionTypes";

export const accountCapabilities = createFeatureCapabilities({
  key: "account",
  resources: {
    accountMappings: {
      shape: "collection",
      verbs: ['read', 'write', 'delete'],
    }
  }
})