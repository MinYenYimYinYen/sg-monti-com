import { isValidKey, type Capability } from "@/permission/PermissionTypes";
import type { CanOf, GroupDefinition, ResourceDefinition } from "@/permission/groupTypes";

// Builds the permission tree from group definitions (see groupTypes.ts for the shape). A group
// file calls defineGroup; the tree and the typed `can` constants are built from the list of them.

/** The one place a capability string is built. */
export function resourceCapability({ resourceKey, verb }: { resourceKey: string; verb: string }): Capability {
  return `${resourceKey}.${verb}` as Capability;
}

function assertValidGroup(group: GroupDefinition): void {
  const { key, name, resources } = group;

  if (!isValidKey(key)) throw new Error(`Invalid group key '${key}': use letters, digits, _ or - (no dots)`);
  if (name.trim() === "") throw new Error(`Group '${key}' needs a name`);
  if (Object.keys(resources).length === 0) throw new Error(`Group '${key}' declares no resources`);

  for (const [resourceKey, resource] of Object.entries(resources)) {
    if (!isValidKey(resourceKey)) {
      throw new Error(`Invalid resource key '${resourceKey}' in group '${key}': use letters, digits, _ or - (no dots)`);
    }
    if (resource.name.trim() === "") throw new Error(`Resource '${resourceKey}' needs a name`);

    const verbs: readonly string[] = resource.verbs;
    if (new Set(verbs).size !== verbs.length) throw new Error(`Resource '${resourceKey}' lists a verb twice`);
    for (const publicVerb of resource.public ?? []) {
      if (!verbs.includes(publicVerb)) {
        throw new Error(`Resource '${resourceKey}': public lists undeclared verb '${publicVerb}'`);
      }
    }
  }
}

/** Validates one group when its file loads, and returns it unchanged with its literal types kept. */
export function defineGroup<const Group extends GroupDefinition>(group: Group): Group {
  assertValidGroup(group);
  return group;
}

export type ListedResource = { groupKey: string; resourceKey: string; resource: ResourceDefinition };

/**
 * Every resource in tree order. Throws on a repeated group key or resource key: keys are unique
 * across the whole tree because a capability string is just `resource.verb`.
 */
export function listResources(groups: readonly GroupDefinition[]): ListedResource[] {
  const groupKeys = new Set<string>();
  const ownerByResourceKey = new Map<string, string>();
  const listed: ListedResource[] = [];

  for (const group of groups) {
    if (groupKeys.has(group.key)) throw new Error(`Duplicate group key '${group.key}' in the permission tree`);
    groupKeys.add(group.key);

    for (const [resourceKey, resource] of Object.entries(group.resources)) {
      const owner = ownerByResourceKey.get(resourceKey);
      if (owner !== undefined) {
        throw new Error(`Duplicate resource key '${resourceKey}' in groups '${owner}' and '${group.key}'`);
      }
      ownerByResourceKey.set(resourceKey, group.key);
      listed.push({ groupKey: group.key, resourceKey, resource });
    }
  }
  return listed;
}

/** The typed `can` constants for the whole tree. */
export function buildCan<const Groups extends readonly GroupDefinition[]>(groups: Groups): CanOf<Groups> {
  const can: Record<string, Record<string, string>> = {};

  for (const { resourceKey, resource } of listResources(groups)) {
    const publicVerbs: readonly string[] = resource.public ?? [];
    const verbConstants: Record<string, string> = {};
    for (const verb of resource.verbs) {
      verbConstants[verb] = publicVerbs.includes(verb) ? "public" : resourceCapability({ resourceKey, verb });
    }
    can[resourceKey] = verbConstants;
  }

  // The loop builds exactly the shape CanOf<Groups> describes, but TS can't prove it through the
  // mapped template-literal types.
  return can as unknown as CanOf<Groups>;
}
