// Capabilities are stored server-side on the user and gate data access. What can be granted is
// defined once, as a tree of groups, resources and verbs (see groupTypes.ts and src/permission/
// groups). A capability is `resource.verb`, and the typed `can` constants that RPC handlers and
// components both use are derived from the tree. This file must stay free of server-only imports
// so client bundles can use it.
//
// Every op requires a logged-in user holding the capability, unless its verb is declared
// `public`. A logged-in user with no capabilities is an "applied" user: there is no marker
// for that state, an admin approves by assigning capabilities.
//
// The check takes the verified token payload (server) or the User from the store (client).

import type { User } from '@/app/auth/_types/User';

// ---------- Verbs ----------
export type Verb = 'read' | 'write' | 'delete'; // write covers create and update

/** Data that lives outside our native app data. Absent on a resource means native. */
export type DataSource = 'realGreen' | 'qbo';

// ---------- Capability strings ----------
// `resource.verb`, for example 'customers.read'. A resource key has no dot, so the verb is always
// the last segment.
export type Capability = `${string}.${Verb}`;

/**
 * What an RPC handler's `capability` (and a component's `<Can>`) requires of the user.
 * 'public' needs no login. 'superUser' needs a confirmed superuser and is not a capability:
 * it cannot be granted, so it is how superuser-only ops (such as editing bundles) are gated.
 */
export type CapabilityRequirement = Capability | 'public' | 'superUser';

// A dot in a key would corrupt the resource.verb format, so keys are plain identifiers.
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** The one key format: group keys, resource keys and bundle keys. */
export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
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