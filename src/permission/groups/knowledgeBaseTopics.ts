import { defineGroup } from "@/permission/defineGroup";

export const knowledgeBaseTopicsGroup = defineGroup({
  key: "knowledgeBaseTopics",
  name: "Knowledge base",
  description: "Topics and the documents tagged with them, used by the desktop call assistant",
  resources: {
    // Covers both topics and topic documents, which are edited together. Not `callTopics`, which
    // belongs to RealGreen's call log feature.
    knowledgeTopics: { name: "Knowledge base topics and documents", verbs: ["read", "write", "delete"] },
    // `read` is needed by everyone who uses Ask Away (the prompt and approver list load from here).
    // `write` edits the list of approvers and the AI prompt. Whoever holds it can add themselves as an
    // approver and change what the AI is told, so treat it as an administrator's permission.
    knowledgeSettings: { name: "Knowledge base settings", verbs: ["read", "write"] },
  },
});
