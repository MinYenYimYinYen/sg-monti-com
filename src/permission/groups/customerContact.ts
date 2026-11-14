import { defineGroup } from "@/permission/defineGroup";

export const customerContactGroup = defineGroup({
  key: "customerContact",
  name: "Customer Interaction",
  description: "Letters, Emails, Calls, Call Logs",
  resources: {
    // The live read of one customer's logs. The mirror is read through `customers`.
    callLogs: { name: "Live call logs", source: "realGreen", verbs: ["read"] },
    callTopics: { name: "Call topics", verbs: ["read", "write", "delete"] },
    // Ownership is a separate rule from access: the routes derive the owner from the caller, so
    // `write` only ever saves the holder's own copy, and delete refuses a record the caller does
    // not own. The superuser may delete any.
    formTemplates: { name: "Form templates", verbs: ["read", "write", "delete"] },
    prepayConfigs: { name: "Prepay letter configs", verbs: ["read", "write", "delete"] },
    upsellPriorities: { name: "Upsell priority lists", verbs: ["read", "write", "delete"] },
    quickSendTemplates: { name: "QuickSend templates", verbs: ["read", "write", "delete"] },
    quickSendTemplateGroups: {
      name: "QuickSend template groups",
      verbs: ["read", "write", "delete"],
    },
  },
});
