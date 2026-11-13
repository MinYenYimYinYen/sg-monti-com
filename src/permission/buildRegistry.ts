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

/**
 * `featureKey` and `resourceKey` name the feature that owns the capability (what the string is
 * built from), even when it is listed inside a combined group. `groupKey` and `groupName` are
 * the group the admin screens list it under. A feature registered on its own is a group of one,
 * so the two keys are equal.
 */
export type CapabilityDescription = {
  featureKey: string;
  resourceKey: string;
  source?: DataSource;
  verb: string;
  groupKey: string;
  groupName: string;
};

export type CapabilityGroup = {
  key: string;
  name: string;
  description?: string;
  capabilities: readonly Capability[];
};

export type CapabilityRegistry = {
  /** Every grantable capability. Public verbs grant nothing, so they are not listed. */
  allCapabilities: readonly Capability[];
  /** The unknown-string filter: false for a renamed, removed or never-declared string. */
  has: (capability: string) => boolean;
  describe: (capability: string) => CapabilityDescription | null;
  /** The groups the admin UI lists, in declaration order. A bare feature is a group of one. */
  byGroup: readonly CapabilityGroup[];
  /**
   * What holding a capability also needs, one level deep: the verb companions the feature
   * declares (write and delete need read) plus its declared `requires`. Never consulted by the
   * runtime check. Empty for an unknown string.
   */
  requirementsOf: (capability: string) => readonly Capability[];
};

// A verb's companions: holding the key verb is of little use without these. A companion the
// feature never declared (or made public) is not required.
export const VERB_COMPANIONS: Readonly<Record<string, readonly string[]>> = {
  write: ['read'],
  delete: ['read'],
  readAny: ['read'],
  writeAny: ['readAny'],
  deleteAny: ['readAny', 'delete'],
};

/** The union of every capability string in a list of declarations, for autocomplete. */
export type RegisteredCapability<R extends readonly { capabilities: readonly string[] }[]> =
  R[number]['capabilities'][number];

/**
 * Throws on a duplicate feature key or capability string, and on a declared requirement that
 * names a capability the registry does not have, so a clash or typo fails at module load.
 */
export function buildRegistry(features: readonly RegistrableFeature[]): CapabilityRegistry {
  const allCapabilities: Capability[] = [];
  const descriptions = new Map<string, CapabilityDescription>();
  const byGroup: CapabilityGroup[] = [];
  const groupKeys = new Set<string>();
  const declaredRequirements = new Map<string, readonly Capability[]>();

  for (const { declaration } of features) {
    const {
      key: groupKey,
      name: groupName = groupKey,
      description,
      resources,
      public: publicVerbs = {},
      requires = {},
    } = declaration;
    if (groupKeys.has(groupKey)) {
      throw new Error(`Duplicate feature key '${groupKey}' in the capability registry`);
    }
    groupKeys.add(groupKey);
    const groupCapabilities: Capability[] = [];
    byGroup.push({ key: groupKey, name: groupName, ...(description ? { description } : {}), capabilities: groupCapabilities });

    // In a combined group the resource key is a renamed one. The public and requires lists are
    // keyed by that renamed key, and the owning feature is in `origin`.
    for (const [resourceKey, resource] of Object.entries(resources)) {
      const publicForResource: readonly string[] = publicVerbs[resourceKey] ?? [];
      const source = 'source' in resource ? resource.source : undefined;
      const featureKey = resource.origin?.featureKey ?? groupKey;
      const ownResourceKey = resource.origin?.resourceKey ?? resourceKey;

      for (const verb of resource.verbs) {
        if (publicForResource.includes(verb)) continue;

        const capability = buildCapability({ featureKey: groupKey, resourceKey, resource, verb }) as Capability;
        if (descriptions.has(capability)) {
          throw new Error(`Duplicate capability '${capability}' in the capability registry`);
        }
        descriptions.set(capability, {
          featureKey,
          resourceKey: ownResourceKey,
          ...(source ? { source } : {}),
          verb,
          groupKey,
          groupName,
        });
        allCapabilities.push(capability);
        groupCapabilities.push(capability);

        const declared = requires[`${resourceKey}.${verb}`];
        if (declared) declaredRequirements.set(capability, declared);
      }
    }
  }

  // A second pass, because a requirement can name a capability of a feature registered later.
  const requirements = new Map<string, Capability[]>();
  for (const capability of allCapabilities) {
    const required = new Set<Capability>();

    const verbSeparator = capability.lastIndexOf('.');
    const prefix = capability.slice(0, verbSeparator);
    for (const companionVerb of VERB_COMPANIONS[capability.slice(verbSeparator + 1)] ?? []) {
      const companion = `${prefix}.${companionVerb}`;
      if (descriptions.has(companion)) required.add(companion as Capability);
    }

    for (const declared of declaredRequirements.get(capability) ?? []) {
      if (declared === capability) throw new Error(`Capability '${capability}' requires itself`);
      if (!descriptions.has(declared)) {
        throw new Error(`Capability '${capability}' requires '${declared}', which is not in the capability registry`);
      }
      required.add(declared);
    }
    requirements.set(capability, [...required]);
  }

  return {
    allCapabilities,
    has: (capability) => descriptions.has(capability),
    describe: (capability) => descriptions.get(capability) ?? null,
    byGroup,
    requirementsOf: (capability) => requirements.get(capability) ?? [],
  };
}
