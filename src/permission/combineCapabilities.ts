import {
  FeatureCapabilities,
  isValidKey,
  Resource,
  Verb,
} from "@/permission/PermissionTypes";
import { mergeRecords } from "@/permission/mergeRecords";

// Groups features for the admin screens, the way combineReducers groups slices. A group has a
// human name and description, and the admin assigns the group's capabilities together. It adds no
// capability of its own and does no enforcement: every capability string is still the one its
// feature declared, because each merged resource carries an `origin` and buildCapability builds
// the string from that. Routes and components keep using their own feature's `can` constants.
// This file must stay free of server-only imports so client bundles can use it.

/** Anything createFeatureCapabilities (or combineCapabilities) returns. */
export type CapabilityFeature = {
  declaration: FeatureCapabilities;
  can: unknown;
  capabilities: readonly string[];
};

/**
 * The same three parts as ResolvedFeatureCapabilities. `can` is nested by the feature that owns
 * each capability (`group.can.customer.customers.read`), not flat by resource, because two
 * features can both have a resource with the same key.
 */
export type CombinedCapabilities<Fs extends readonly CapabilityFeature[]> = {
  declaration: FeatureCapabilities;
  can: { [F in Fs[number] as F["declaration"]["key"]]: F["can"] };
  capabilities: readonly Fs[number]["capabilities"][number][];
};

/** Merged resource keys are prefixed with the feature key so equal resource keys cannot clash. */
function prefixed({ featureKey, key }: { featureKey: string; key: string }): string {
  return `${featureKey}_${key}`;
}

function withOrigin(declaration: FeatureCapabilities): Record<string, Resource> {
  return Object.fromEntries(
    Object.entries(declaration.resources).map(([resourceKey, resource]) => [
      resourceKey,
      // A feature that is itself a group already has its resources' origins, which must survive.
      { ...resource, origin: resource.origin ?? { featureKey: declaration.key, resourceKey } },
    ]),
  ) as Record<string, Resource>;
}

export function combineCapabilities<const Fs extends readonly CapabilityFeature[]>({
  key,
  name,
  description,
  features,
}: {
  key: string;
  name: string;
  description: string;
  features: Fs;
}): CombinedCapabilities<Fs> {
  if (!isValidKey(key)) {
    throw new Error(`Invalid group key '${key}': use letters, digits, _ or - (no dots)`);
  }
  if (features.length === 0) {
    throw new Error(`Group '${key}' combines no features`);
  }

  const resources = mergeRecords<Resource>({
    what: "resource",
    parts: features.map(({ declaration }) => ({
      record: withOrigin(declaration),
      rekey: (resourceKey) => prefixed({ featureKey: declaration.key, key: resourceKey }),
    })),
  });

  const publicVerbs = mergeRecords<readonly Verb[]>({
    what: "public verb list",
    parts: features.map(({ declaration }) => ({
      record: declaration.public ?? {},
      rekey: (resourceKey) => prefixed({ featureKey: declaration.key, key: resourceKey }),
    })),
  });

  // Merging by feature key is also what rejects the same feature being listed twice.
  const can = mergeRecords<unknown>({
    what: "feature",
    parts: features.map(({ declaration, can: featureCan }) => ({
      record: { [declaration.key]: featureCan },
      rekey: (featureKey) => featureKey,
    })),
  });

  const declaration: FeatureCapabilities = {
    key,
    name,
    description,
    resources,
    ...(Object.keys(publicVerbs).length > 0 ? { public: publicVerbs } : {}),
  };

  // The loops build exactly the shape CombinedCapabilities<Fs> describes, but TS can't prove it
  // through the mapped types.
  return {
    declaration,
    can,
    capabilities: features.flatMap((feature) => feature.capabilities),
  } as unknown as CombinedCapabilities<Fs>;
}
