import { defineGroup } from "@/permission/defineGroup";

export const aiAssistantGroup = defineGroup({
  key: "aiAssistant",
  name: "AI assistant",
  description: "Calls to the Claude API, which cost money for every request",
  resources: {
    // Every request is billed to the company's Anthropic account, and what the caller sends leaves
    // the system. Kept in its own group so a group-wide grant of ordinary access never includes it.
    // `write` is having a conversation (and saving it), `read` is reading saved conversations,
    // `delete` is removing them.
    claudeRequests: { name: "Claude requests", verbs: ["read", "write", "delete"] },
  },
});
