import { buildRegistry } from "@/permission/buildRegistry";
import type { BundleGrants, UserGrants } from "@/permission/logic/permissionLogicTypes";
import { custFlagCapabilities, reportCapabilities, widgetCapabilities } from "./permissionFixtures";

// Test registry: custFlag.read/write (realGreen) and widgetManagement widgets read/write/delete
// plus preferences read/write/delete/readAny.
export const registry = buildRegistry([custFlagCapabilities, widgetCapabilities]);

// The same plus `reports`, whose capabilities declare `requires` on the other two features.
export const registryWithReports = buildRegistry([custFlagCapabilities, widgetCapabilities, reportCapabilities]);

export const flagCan = custFlagCapabilities.can;
export const widgetCan = widgetCapabilities.can;
export const reportCan = reportCapabilities.can;

/** Reads only. */
export const baselineBundle: BundleGrants = {
  bundleKey: "baseline",
  capabilities: [widgetCan.widgets.read, widgetCan.preferences.read],
};

/** Overlaps baseline on widgets.read, and holds a write without its read companion on custFlags. */
export const officeBundle: BundleGrants = {
  bundleKey: "office",
  capabilities: [widgetCan.widgets.read, widgetCan.widgets.write, flagCan.custFlags.write],
};

export const emptyBundle: BundleGrants = { bundleKey: "empty", capabilities: [] };

export const allBundles: readonly BundleGrants[] = [baselineBundle, officeBundle, emptyBundle];

export function makeUserGrants(overrides: Partial<UserGrants> = {}): UserGrants {
  return { userName: "dana", bundleKeys: [], capabilities: [], ...overrides };
}
