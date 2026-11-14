import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Scheduling: the daily loadout records (start and finish of a tech's truck) and the ETAs that
// cover sheets and prenotification show.
//
// loadouts.read     -> dailyInventory getLoadouts, getLoadout, getLoadoutKeys
// loadouts.write    -> dailyInventory upsertLoadout
// serviceEtas.read  -> eta getServiceEtas
// serviceEtas.write -> eta saveServiceEta
//
// There is no delete: a loadout or an ETA is only ever replaced by saving again. Start and finish
// loadout both go through upsertLoadout, so they share `loadouts.write`. That op replaces the
// stored document whole, including a finished one, with no check.
//
// The cover sheet and prenotification screens own no data of their own, so they use
// `serviceEtas.read` as their entry capability, and the loadout screens use `loadouts.read`.
export const schedulingCapabilities = createFeatureCapabilities({
  key: "scheduling",
  resources: {
    loadouts: { shape: "collection", verbs: ["read", "write"] },
    serviceEtas: { shape: "collection", verbs: ["read", "write"] },
  },
});
