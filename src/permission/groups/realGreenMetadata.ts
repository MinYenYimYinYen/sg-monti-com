import { defineGroup } from "@/permission/defineGroup";

// RealGreen's own lists, read live from RealGreen (this app never changes them), plus the settings
// this app keeps beside the program, service and call-ahead lists.
export const realGreenMetadataGroup = defineGroup({
  key: "realGreenMetadata",
  name: "Real Green Metadata",
  resources: {
    flags: { name: "Customer flag definitions", source: "realGreen", verbs: ["read"] },
    conditionCodes: { name: "Condition codes", source: "realGreen", verbs: ["read"] },
    taxCodes: { name: "Tax codes", source: "realGreen", verbs: ["read"] },
    zipCodes: { name: "Zip codes", source: "realGreen", verbs: ["read"] },
    prepays: { name: "Prepay codes", source: "realGreen", verbs: ["read"] },
    discounts: { name: "Discounts", source: "realGreen", verbs: ["read"] },
    companies: { name: "Companies", source: "realGreen", verbs: ["read"] },
    employees: { name: "Employees", source: "realGreen", verbs: ["read"] },
    priceTables: { name: "Price tables", source: "realGreen", verbs: ["read"] },
    rgAccounts: { name: "General ledger accounts", source: "realGreen", verbs: ["read"] },

    // The two code lists live in RealGreen and are read only here. The settings this app keeps
    // beside them are only ever loaded merged into the lists, so they have no read of their own.
    progCodes: { name: "Program codes", source: "realGreen", verbs: ["read"] },
    servCodes: { name: "Service codes", source: "realGreen", verbs: ["read"] },
    // A program code's price tables affect every price shown for that program.
    progCodeDocProps: { name: "Program code settings", verbs: ["write"] },
    // A service code's rules and call-ahead tag only affect scheduling and call-aheads.
    servCodeDocProps: { name: "Service code settings", verbs: ["write"] },
    callAheads: { name: "Call-aheads", source: "realGreen", verbs: ["read"] },
    callAheadDocProps: { name: "Call-ahead settings", verbs: ["write"] },
    // Deleting a keyword removes a message that call-aheads may still point at.
    callAheadKeywords: { name: "Call-ahead keywords", verbs: ["read", "write", "delete"] },
  },
});
