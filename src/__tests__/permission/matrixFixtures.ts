import { combineCapabilities } from "@/permission/combineCapabilities";
import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Features for the capability matrix tests: two with a same-named `customers` resource (grouped),
// one with two resources of different shapes, and a bare one.
export const billing = createFeatureCapabilities({
  key: "billing",
  resources: { customers: { shape: "collection", source: "qbo", verbs: ["read"] } },
});

export const crm = createFeatureCapabilities({
  key: "crm",
  resources: { customers: { shape: "collection", source: "realGreen", verbs: ["read", "write", "delete"] } },
});

export const ledger = createFeatureCapabilities({
  key: "ledger",
  resources: {
    entries: { shape: "collection", verbs: ["read"] },
    postings: { shape: "singleton", source: "qbo", verbs: ["write"] },
  },
});

export const notes = createFeatureCapabilities({
  key: "notes",
  resources: { notes: { shape: "collection", verbs: ["read", "write"] } },
});

export const customersGroup = combineCapabilities({
  key: "customers",
  name: "Customers",
  description: "Customer lists from both systems.",
  features: [billing, crm],
});
