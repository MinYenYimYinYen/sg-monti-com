import type { Capability, DataSource } from "@/permission/PermissionTypes";

// What the registry hands the admin screens and the logic that reads it. Pure types, so the
// permission logic never imports the tree itself and stays testable with a small stand-in.

/** Where a capability sits in the tree. `source` is metadata (a "QBO" badge), not part of a string. */
export type CapabilityDescription = {
  resourceKey: string;
  resourceName: string;
  source?: DataSource;
  verb: string;
  groupKey: string;
  groupName: string;
};

export type RegistryResource = {
  key: string;
  name: string;
  description?: string;
  source?: DataSource;
  /** What this resource can grant, public verbs left out. */
  capabilities: readonly Capability[];
};

export type RegistryGroup = {
  key: string;
  name: string;
  description?: string;
  resources: readonly RegistryResource[];
  /** Every capability of every resource in the group, in tree order. */
  capabilities: readonly Capability[];
};

export type CapabilityRegistry = {
  /** Every grantable capability. Public verbs grant nothing, so they are not listed. */
  allCapabilities: readonly Capability[];
  /** The unknown-string filter: false for a renamed, removed or never-declared string. */
  has: (capability: string) => boolean;
  describe: (capability: string) => CapabilityDescription | null;
  /** The tree the admin UI draws, in definition order. */
  byGroup: readonly RegistryGroup[];
};

// A verb's companions: holding the key verb is of little use without these. The matrix ticks
// them together (write ticks read) and clears what depends on a cleared verb. A companion the
// resource never declared (or made public) is simply not there to tick.
export const VERB_COMPANIONS: Readonly<Record<string, readonly string[]>> = {
  write: ["read"],
  delete: ["read"],
};
