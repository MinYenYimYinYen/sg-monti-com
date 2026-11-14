import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// The one stored settings document: current season, cover sheet flags, renewal flag ids, phone
// map and the price increase flag mappings. There is one of it, so it is a singleton, not a
// collection.
//
// settings.read  -> globalSettings getSettings
// settings.write -> globalSettings updateSettings
//
// getSettings was open to admin, office and tech, and nearly every screen loads it for the current
// season. Without `read` the load is refused and the store keeps its empty state, so those screens
// see no season.
export const globalSettingsCapabilities = createFeatureCapabilities({
  key: "globalSettings",
  resources: {
    settings: { shape: "singleton", verbs: ["read", "write"] },
  },
});
