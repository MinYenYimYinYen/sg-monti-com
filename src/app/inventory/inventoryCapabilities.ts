import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Monthly inventory counts: the saved check (one per date) and the screens that record and review
// it.
//
// inventoryChecks.read  -> inventory getInventoryChecks
// inventoryChecks.write -> inventory saveInventoryCheck
//
// There is no delete: a check can only be replaced by saving again on the same date. That replace
// is the normal edit (the count screen reloads today's check to continue it), so it stays under
// `write` and not its own capability.
export const inventoryCapabilities = createFeatureCapabilities({
  key: "inventory",
  resources: {
    inventoryChecks: { shape: "collection", verbs: ["read", "write"] },
  },
});
