import type { DataSource, Verb } from "@/permission/PermissionTypes";

// The permission tree: groups hold resources, resources hold verbs. It is the one definition of
// what can be granted, and it is written once, in src/permission/groups, instead of beside each
// data module.
//
//   group     what the admin screens list and assign together. Never part of a capability string,
//             so regrouping or renaming a group changes no stored grant and no handler.
//   resource  one thing a capability governs, named for the data it holds (qboCustomers, not
//             quickbooks). The key is unique across the whole tree.
//   verb      read, write or delete. Who may touch which record (ownership) is enforced by the
//             handler, not by a verb.
//
// A capability string is `resource.verb` (`customers.read`). Handlers pick the capability an op
// needs from `can`, and components gate on the same constants. These files must stay free of
// server-only imports so client bundles can use them.

export type ResourceDefinition = {
  /** Shown in the admin screens. Required, so nobody has to read a code key to know what it is. */
  name: string;
  /** Only where the name alone leaves room for confusion. */
  description?: string;
  /** Where the data lives, when it is not ours. Shown as a badge, never part of a capability. */
  source?: DataSource;
  /** Every capability the resource can grant. List only verbs that some op actually checks. */
  verbs: readonly [Verb, ...Verb[]];
  /** Verbs that need no login. They resolve to 'public' and grant nothing. */
  public?: readonly Verb[];
};

export type GroupDefinition = {
  key: string;
  name: string;
  description?: string;
  resources: Record<string, ResourceDefinition>;
};

// ---------- derived types ----------
type UnionToIntersection<Union> = (Union extends unknown ? (arg: Union) => void : never) extends (
  arg: infer Intersection,
) => void
  ? Intersection
  : never;

/** Every resource of every group as one record. A repeated key is caught when the tree is built. */
type ResourcesOf<Groups extends readonly GroupDefinition[]> = UnionToIntersection<Groups[number]["resources"]>;

type PublicVerbsOf<Resource> = Resource extends { public: readonly (infer PublicVerb)[] } ? PublicVerb : never;

type VerbConstants<ResourceKey extends string, Resource extends ResourceDefinition> = {
  [VerbName in Resource["verbs"][number]]: VerbName extends PublicVerbsOf<Resource>
    ? "public"
    : `${ResourceKey}.${VerbName}`;
};

/** Typed constants for handlers (`capability: can.customers.read`) and components. */
export type CanOf<Groups extends readonly GroupDefinition[]> = {
  [ResourceKey in keyof ResourcesOf<Groups> & string]: ResourcesOf<Groups>[ResourceKey] extends ResourceDefinition
    ? VerbConstants<ResourceKey, ResourcesOf<Groups>[ResourceKey]>
    : never;
};

/** Every capability string the tree can grant (public verbs grant nothing), for autocomplete. */
export type GroupCapability<Groups extends readonly GroupDefinition[]> = {
  [ResourceKey in keyof CanOf<Groups> & string]: Exclude<
    CanOf<Groups>[ResourceKey][keyof CanOf<Groups>[ResourceKey]],
    "public"
  >;
}[keyof CanOf<Groups> & string];
