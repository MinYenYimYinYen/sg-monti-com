import type { Capability } from "@/permission/PermissionTypes";
import type { CapabilityRegistry } from "@/permission/buildRegistry";

// Text for the admin screens. Pure, so the grouping and labels can be tested without React.

type Describer = Pick<CapabilityRegistry, "describe">;

/** `resource (source) · verb`. A string the registry no longer knows is shown exactly as stored. */
export function capabilityLabel({ capability, registry }: { capability: string; registry: Describer }): string {
  const description = registry.describe(capability);
  if (!description) return capability;
  const source = description.source ? ` (${description.source})` : "";
  return `${description.resourceKey}${source} · ${description.verb}`;
}

export type FeatureCapabilities = { featureKey: string; capabilities: Capability[] };

/**
 * Splits capabilities by the feature that declares them, features in alphabetical order and each
 * feature's capabilities in the order given. Strings the registry does not know come back
 * separately, so a stale grant is visible instead of silently disappearing.
 */
export function groupCapabilitiesByFeature({
  capabilities,
  registry,
}: {
  capabilities: readonly Capability[];
  registry: Describer;
}): { features: FeatureCapabilities[]; unknown: Capability[] } {
  const capabilitiesByFeature = new Map<string, Capability[]>();
  const unknown: Capability[] = [];

  for (const capability of capabilities) {
    const description = registry.describe(capability);
    if (!description) {
      unknown.push(capability);
      continue;
    }
    const featureCapabilities = capabilitiesByFeature.get(description.featureKey) ?? [];
    featureCapabilities.push(capability);
    capabilitiesByFeature.set(description.featureKey, featureCapabilities);
  }

  const features = [...capabilitiesByFeature.entries()]
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([featureKey, featureCapabilities]) => ({ featureKey, capabilities: featureCapabilities }));

  return { features, unknown };
}
