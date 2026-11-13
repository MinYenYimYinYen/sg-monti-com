import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { appMethodCapabilities } from "@/app/appMethod/appMethodCapabilities";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";

// Monthly inventory counts: the saved check (one per date) and the screens that record and review
// it.
//
// inventoryChecks.read  -> inventory getInventoryChecks
// inventoryChecks.write -> inventory saveInventoryCheck
//
// There is no delete: a check can only be replaced by saving again on the same date. That replace
// is the normal edit (the count screen reloads today's check to continue it), so it stays under
// `write` and not its own capability.
//
// requires: the count screen also loads the product list with its application methods (through
// useProduct) and the current season (through useRecentProduction). The product masters and the
// customer data it reads are not declared yet (deferred), so only the two that exist are listed.
export const inventoryCapabilities = createFeatureCapabilities({
  key: "inventory",
  resources: {
    inventoryChecks: { shape: "collection", verbs: ["read", "write"] },
  },
  requires: {
    "inventoryChecks.read": [
      appMethodCapabilities.can.appMethods.read,
      globalSettingsCapabilities.can.settings.read,
    ],
  },
});
