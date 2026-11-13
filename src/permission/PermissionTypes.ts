// Capabilities are stored server-side on the user and gate data access. A feature declares
// only the resources it owns (data owned by another feature is gated by that feature's own
// capabilities); every capability string, and the typed `can` constants that RPC handlers
// and components both use, are derived from that declaration. This file must stay free of
// server-only imports so client bundles can use it.
//
// Every op requires a logged-in user holding the capability, unless its verb is declared
// `public`. A logged-in user with no capabilities is an "applied" user: there is no marker
// for that state, an admin approves by assigning capabilities.
//
// The check takes the verified token payload (server) or the User from the store (client).

import type { User } from '@/app/auth/_types/User';

// ---------- Verbs ----------
export type Verb = 'read' | 'write' | 'delete'; // write covers create and update
export type SingletonVerb = 'read' | 'write';
export type AnyVerb = 'readAny' | 'writeAny' | 'deleteAny';
export type UserOwnedVerb = Verb | AnyVerb;

/** Data that lives outside our native app data. Absent on a resource means native. */
export type DataSource = 'realGreen' | 'qbo';

/**
 * Set only by combineCapabilities. A group renames its resources to keep them unique, and the
 * origin is what keeps the capability string the one the owning feature declared, so stored
 * grants and handlers keep matching.
 */
export type ResourceOrigin = { featureKey: string; resourceKey: string };

// ---------- Resources ----------
// `shape` (how data is stored) and `source` (where it lives) are separate axes.
// `verbs` is required and lists every capability the feature can grant, so the declaration
// is the whole truth. List only verbs that some op actually checks.
export type CollectionResource = {
  shape: 'collection';
  source?: DataSource;
  verbs: readonly [Verb, ...Verb[]];
  origin?: ResourceOrigin;
};

export type SingletonResource = {
  shape: 'singleton';
  source?: DataSource;
  verbs: readonly [SingletonVerb, ...SingletonVerb[]];
  origin?: ResourceOrigin;
};

// Native only: per-user config never lives in RealGreen or QBO.
export type UserOwnedResource = {
  shape: 'userOwned';
  verbs: readonly [UserOwnedVerb, ...UserOwnedVerb[]];
  origin?: ResourceOrigin;
};

export type Resource = CollectionResource | SingletonResource | UserOwnedResource;

export type FeatureCapabilities = {
  key: string;
  resources: Record<string, Resource>;
  /** Heading in the admin screens. Set on a combined group, defaults to the key. */
  name?: string;
  /** What assigning this means, shown beside the heading. Set on a combined group. */
  description?: string;
  /** Verbs that need no login, by resource key. They resolve to 'public' and grant nothing. */
  public?: Record<string, readonly Verb[]>;
  /**
   * What holding a capability also needs, keyed `resource.verb` and listing other capabilities
   * (use the `can` constants of the feature that owns them, so a rename breaks the build). This
   * never grants anything at runtime: the admin screens offer these when a capability is
   * assigned, and the editors warn when one is missing. A verb's own companions (write and
   * delete need read) are implied and need not be listed.
   */
  requires?: Record<string, readonly Capability[]>;
};

// ---------- Derived capability strings ----------
// native:   feature.resource.verb            e.g. 'widgetManagement.widgets.write'
// external: feature.resource.source.verb     e.g. 'customer.customers.realGreen.read'
export type Capability = `${string}.${string}.${string}`;

/**
 * What an RPC handler's `capability` (and a component's `<Can>`) requires of the user.
 * 'public' needs no login. 'superUser' needs a confirmed superuser and is not a capability:
 * it cannot be granted, so it is how superuser-only ops (such as editing bundles) are gated.
 */
export type CapabilityRequirement = Capability | 'public' | 'superUser';

export type VerbsOf<R extends Resource> = R['verbs'][number];

type PublicVerbsOf<F extends FeatureCapabilities, ResourceKey extends string> = F extends {
  public: infer P;
}
  ? ResourceKey extends keyof P
    ? P[ResourceKey] extends readonly (infer V)[]
      ? V
      : never
    : never
  : never;

type SourceSegment<R extends Resource> = R extends { source: infer S extends DataSource }
  ? `.${S}`
  : '';

type CapabilityString<
  FeatureKey extends string,
  ResourceKey extends string,
  R extends Resource,
  V extends string,
> = `${FeatureKey}.${ResourceKey}${SourceSegment<R>}.${V}`;

/** Typed constants for handlers (`capability: capabilities.can.widgets.write`) and components. */
export type FeatureCan<F extends FeatureCapabilities> = {
  [ResourceKey in keyof F['resources'] & string]: {
    [V in VerbsOf<F['resources'][ResourceKey]>]: V extends PublicVerbsOf<F, ResourceKey>
      ? 'public'
      : CapabilityString<F['key'], ResourceKey, F['resources'][ResourceKey], V>;
  };
};

/** Every capability string the feature can grant (public verbs grant nothing). */
export type FeatureCapability<F extends FeatureCapabilities> = {
  [ResourceKey in keyof F['resources'] & string]: CapabilityString<
    F['key'],
    ResourceKey,
    F['resources'][ResourceKey],
    Exclude<VerbsOf<F['resources'][ResourceKey]>, PublicVerbsOf<F, ResourceKey>>
  >;
}[keyof F['resources'] & string];

/** The declaration resolved into typed `can` constants and a flat capability list. */
export type ResolvedFeatureCapabilities<F extends FeatureCapabilities> = {
  declaration: F;
  can: FeatureCan<F>;
  capabilities: readonly FeatureCapability<F>[];
};

// ---------- createFeatureCapabilities ----------
/** The one place a capability string is built, shared by createFeatureCapabilities and the registry. */
export function buildCapability({
  featureKey,
  resourceKey,
  resource,
  verb,
}: {
  featureKey: string;
  resourceKey: string;
  resource: Resource;
  verb: string;
}): string {
  const source = 'source' in resource && resource.source ? `.${resource.source}` : '';
  const { origin } = resource;
  return `${origin?.featureKey ?? featureKey}.${origin?.resourceKey ?? resourceKey}${source}.${verb}`;
}

// A dot in a key would corrupt the feature.resource.verb format, so keys are plain identifiers.
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** The one key format: feature keys, resource keys and bundle keys. */
export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

/** Fails fast at module load so a bad declaration never reaches an admin or a handler. */
function assertValidDeclaration(declaration: FeatureCapabilities): void {
  const { key, resources, public: publicVerbs = {}, requires = {} } = declaration;

  if (!KEY_PATTERN.test(key)) throw new Error(`Invalid feature key '${key}': use letters, digits, _ or - (no dots)`);
  for (const resourceKey of Object.keys(resources)) {
    if (!KEY_PATTERN.test(resourceKey)) {
      throw new Error(`Invalid resource key '${key}.${resourceKey}': use letters, digits, _ or - (no dots)`);
    }
  }

  for (const [resourceKey, verbs] of Object.entries(publicVerbs)) {
    const resource = resources[resourceKey];
    if (!resource) throw new Error(`${key}: public references unknown resource '${resourceKey}'`);
    for (const verb of verbs) {
      if (!(resource.verbs as readonly string[]).includes(verb)) {
        throw new Error(`${key}: public lists undeclared verb '${resourceKey}.${verb}'`);
      }
    }
  }

  for (const [requirementKey, required] of Object.entries(requires)) {
    const parts = requirementKey.split('.');
    const resource = parts.length === 2 ? resources[parts[0]] : undefined;
    if (!resource || !(resource.verbs as readonly string[]).includes(parts[1])) {
      throw new Error(`${key}: requires lists unknown capability '${requirementKey}' (use resource.verb)`);
    }
    // A public verb grants nothing, so there is nothing to attach requirements to.
    if ((publicVerbs[parts[0]] as readonly string[] | undefined)?.includes(parts[1])) {
      throw new Error(`${key}: requires lists the public verb '${requirementKey}'`);
    }
    // Widened to string: the type forbids an empty entry, but a hand-built declaration can hold one.
    if (required.some((requiredCapability) => typeof requiredCapability !== 'string' || (requiredCapability as string) === '')) {
      throw new Error(`${key}: requires '${requirementKey}' lists an empty capability`);
    }
  }
}

/**
 * Builds the typed `can` constants and the flat capability list from one feature declaration.
 * `const F` keeps keys and verbs as literals so the derived strings stay exact.
 * The runtime strings must stay in step with CapabilityString above.
 */
export function createFeatureCapabilities<const F extends FeatureCapabilities>(
  declaration: F,
): ResolvedFeatureCapabilities<F> {
  assertValidDeclaration(declaration);

  const can: Record<string, Record<string, string>> = {};
  const capabilities: string[] = [];

  for (const [resourceKey, resource] of Object.entries(declaration.resources)) {
    const publicVerbs: readonly string[] = declaration.public?.[resourceKey] ?? [];
    const verbConstants: Record<string, string> = {};

    for (const verb of resource.verbs) {
      if (publicVerbs.includes(verb)) {
        verbConstants[verb] = 'public';
        continue;
      }
      const capability = buildCapability({ featureKey: declaration.key, resourceKey, resource, verb });
      verbConstants[verb] = capability;
      capabilities.push(capability);
    }
    can[resourceKey] = verbConstants;
  }

  // The loop builds exactly the shape ResolvedFeatureCapabilities<F> describes, but TS can't
  // prove it through the mapped template-literal types.
  return { declaration, can, capabilities } as unknown as ResolvedFeatureCapabilities<F>;
}

// ---------- Users and the capability check ----------
/**
 * Whether the superuser bypass applies to an account. Superuser status is set in Compass only;
 * no app route writes it. A kiosk never acts as a superuser, even if the flag is set. On the
 * server the user document decides (never the token claim); on the client this is only a UX hint.
 */
export function isSuperUserEffective(user: Pick<User, 'isSuperUser' | 'isKiosk'>): boolean {
  return !!user.isSuperUser && !user.isKiosk;
}

/**
 * The one capability check, shared by the server (RPC handlers) and the client (`<Can>`).
 * Every non-public op needs a logged-in user. A confirmed superuser bypasses the capability
 * list. A logged-in user with no capabilities is an "applied" user and passes nothing.
 * `isSuperUserConfirmed` must come from the database on the server, never from the token claim.
 */
export function hasCapability({
  required,
  identity,
  isSuperUserConfirmed,
  capabilities,
}: {
  required: CapabilityRequirement;
  identity: Pick<User, 'userName' | 'isSuperUser'> | null;
  isSuperUserConfirmed: boolean;
  capabilities: readonly Capability[];
}): boolean {
  if (required === 'public') return true;
  if (!identity) return false;
  if (required === 'superUser') return isSuperUserConfirmed;
  if (isSuperUserConfirmed) return true;
  return capabilities.includes(required);
}
