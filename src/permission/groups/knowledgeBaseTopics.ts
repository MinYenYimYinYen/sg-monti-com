import { defineGroup } from "@/permission/defineGroup";

export const knowledgeBaseTopicsGroup = defineGroup({
  key: "knowledgeBaseTopics",
  name: "Knowledge base",
  description: "Topics and the documents tagged with them, used by the desktop call assistant",
  resources: {
    // Covers both topics and topic documents, which are edited together. Not `callTopics`, which
    // belongs to RealGreen's call log feature.
    knowledgeTopics: { name: "Knowledge base topics and documents", verbs: ["read", "write", "delete"] },
  },
});
