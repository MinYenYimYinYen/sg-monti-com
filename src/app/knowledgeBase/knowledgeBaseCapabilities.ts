import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Call topics (what the call assist classifies a call into, and the guidance shown for it).
//
// topics.read   -> topic getAll
// topics.write  -> topic upsert
// topics.delete -> topic remove
//
// getAll was admin and office while upsert and remove were admin only.
export const knowledgeBaseCapabilities = createFeatureCapabilities({
  key: "knowledgeBase",
  resources: {
    topics: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
