import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Which QuickBooks account each Javelin deposit field (and the two check deposit accounts) posts
// to. The links are shown on the account mapping page, but they are separate data with their own
// route, so they are gated separately: someone can hold the account links without these.
//
// depositFieldLinks.read   -> depositMapping getAll
// depositFieldLinks.write  -> depositMapping upsert (the account and the default name)
// depositFieldLinks.delete -> depositMapping remove
export const depositMappingCapabilities = createFeatureCapabilities({
  key: "depositMapping",
  resources: {
    depositFieldLinks: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
