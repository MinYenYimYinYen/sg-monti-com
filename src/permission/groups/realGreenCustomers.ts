import { defineGroup } from "@/permission/defineGroup";

export const realGreenCustomersGroup = defineGroup({
  key: "realGreenCustomers",
  name: "Real Green Customers",
  description: "Customers, Programs, Services and related items",
  resources: {
    // Customer, program and service data, and nearly every screen loads it. It is normally read
    // from the synced copy in MongoDB (the mirror). The live RealGreen path (refreshCustomer and
    // runSearchScheme) is kept as a fallback in case the mirror has trouble. Nobody chooses between
    // them, so both ops use this one capability.
    customers: {
      name: "Customers, programs and services",
      source: "realGreen",
      verbs: ["read"],
    },
    customerFlags: {
      name: "Customer flags",
      source: "realGreen",
      verbs: ["read"],
    },
    // Puts a flag on real customers in RealGreen, and this app cannot take it back off. Flags drive
    // billing and routing there, and the price increase "Assign All" button assigns them in bulk.
    flagAssignments: {
      name: "Assign flags to customers",
      source: "realGreen",
      verbs: ["write"],
    },
    serviceConditions: {
      name: "Service conditions",
      source: "realGreen",
      verbs: ["read"],
    },
    flagRules: {
      name: "Flag rules",
      verbs: ["read", "write", "delete"],
    },
  },
});
