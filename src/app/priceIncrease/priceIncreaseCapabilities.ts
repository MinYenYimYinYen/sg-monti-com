import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// The price increase module's own stored data: named increase plans (a percent per season) and
// named increase settings (which program, the caps, the upsell bonus, the rounding). Exactly one
// settings document is active, and the results for every customer follow it. The flag mappings,
// exempt flags and manual flag are not stored here: they live on the global settings document and
// are gated by `globalSettings.settings.write`.
//
// increasePlans.read      -> seasonIncreases getAll
// increasePlans.write     -> seasonIncreases upsert
// increasePlans.delete    -> seasonIncreases remove
// increaseSettings.read   -> settings getAll
// increaseSettings.write  -> settings upsert, setActive
// increaseSettings.delete -> settings remove
//
// Every write and delete was admin only, and the reads were admin and office. `setActive` stays
// under `write`: it only flips which stored settings are active and can be flipped back.
export const priceIncreaseCapabilities = createFeatureCapabilities({
  key: "priceIncrease",
  resources: {
    increasePlans: { shape: "collection", verbs: ["read", "write", "delete"] },
    increaseSettings: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
