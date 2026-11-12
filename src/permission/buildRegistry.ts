import {
  buildCapability,
  Capability,
  DataSource,
  FeatureCapabilities,
} from '@/permission/PermissionTypes';

// The registry is the list of every capability the app can grant. Each feature declares its own
// (see createFeatureCapabilities); the registry only collects them. Every function that needs the
// list takes a registry as a parameter, so tests pass a registry built from test-local
// declarations and only the edges (loaders, routes, hooks) pass the real one. This file must stay
// free of server-only imports so client bundles can use it.

/** Anything createFeatureCapabilities returns. Only the declaration is read. */
export type RegistrableFeature = { declaration: FeatureCapabilities };

export type CapabilityDescription = {
  featureKey: string;
  resourceKey: string;
  source?: DataSource;
  verb: string;
};

export type CapabilityRegistry = {
  /** Every grantable capability. Public verbs grant nothing, so they are not listed. */
  allCapabilities: readonly Capability[];
  /** The unknown-string filter: false for a renamed, removed or never-declared string. */
  has: (capability: string) => boolean;
  describe: (capability: string) => CapabilityDescription | null;
  /** Capabilities grouped by feature key, in declaration order, for the admin UI. */
  byFeature: Readonly<Record<string, readonly Capability[]>>;
};

/** The union of every capability string in a list of declarations, for autocomplete. */
export type RegisteredCapability<R extends readonly { capabilities: readonly string[] }[]> =
  R[number]['capabilities'][number];

/** Throws on a duplicate feature key or capability string, so a clash fails at module load. */
export function buildRegistry(features: readonly RegistrableFeature[]): CapabilityRegistry {
  const allCapabilities: Capability[] = [];
  const descriptions = new Map<string, CapabilityDescription>();
  const byFeature: Record<string, Capability[]> = {};

  for (const { declaration } of features) {
    const { key: featureKey, resources, public: publicVerbs = {} } = declaration;
    if (featureKey in byFeature) {
      throw new Error(`Duplicate feature key '${featureKey}' in the capability registry`);
    }
    const featureCapabilities: Capability[] = [];
    byFeature[featureKey] = featureCapabilities;

    for (const [resourceKey, resource] of Object.entries(resources)) {
      const publicForResource: readonly string[] = publicVerbs[resourceKey] ?? [];
      const source = 'source' in resource ? resource.source : undefined;

      for (const verb of resource.verbs) {
        if (publicForResource.includes(verb)) continue;

        const capability = buildCapability({ featureKey, resourceKey, resource, verb }) as Capability;
        if (descriptions.has(capability)) {
          throw new Error(`Duplicate capability '${capability}' in the capability registry`);
        }
        descriptions.set(capability, { featureKey, resourceKey, ...(source ? { source } : {}), verb });
        allCapabilities.push(capability);
        featureCapabilities.push(capability);
      }
    }
  }

  return {
    allCapabilities,
    has: (capability) => descriptions.has(capability),
    describe: (capability) => descriptions.get(capability) ?? null,
    byFeature,
  };
}
