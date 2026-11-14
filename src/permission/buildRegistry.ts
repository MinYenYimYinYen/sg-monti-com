import type { Capability } from "@/permission/PermissionTypes";
import { listResources, resourceCapability } from "@/permission/defineGroup";
import type { GroupDefinition } from "@/permission/groupTypes";
import type {
  CapabilityDescription,
  CapabilityRegistry,
  RegistryGroup,
  RegistryResource,
} from "@/permission/registryTypes";

// The registry is the list of every capability the app can grant, read from the permission tree.
// Every function that needs the list takes a registry as a parameter, so tests pass a registry
// built from a test-local tree and only the edges (loaders, routes, hooks) pass the real one.
// This file must stay free of server-only imports so client bundles can use it.

/**
 * Throws on a repeated group key or resource key, so a clash fails at module load. A resource whose
 * every verb is public has nothing to grant and is left out of the groups.
 */
export function buildRegistry(groups: readonly GroupDefinition[]): CapabilityRegistry {
  const listed = listResources(groups);

  const allCapabilities: Capability[] = [];
  const descriptions = new Map<string, CapabilityDescription>();
  const groupsByKey = new Map<string, { group: GroupDefinition; resources: RegistryResource[] }>();
  for (const group of groups) groupsByKey.set(group.key, { group, resources: [] });

  for (const { groupKey, resourceKey, resource } of listed) {
    const entry = groupsByKey.get(groupKey);
    if (!entry) continue;

    const source = "source" in resource ? resource.source : undefined;
    const publicVerbs: readonly string[] = resource.public ?? [];
    const capabilities: Capability[] = [];

    for (const verb of resource.verbs) {
      if (publicVerbs.includes(verb)) continue;
      const capability = resourceCapability({ resourceKey, verb });
      descriptions.set(capability, {
        resourceKey,
        resourceName: resource.name,
        ...(source ? { source } : {}),
        verb,
        groupKey,
        groupName: entry.group.name,
      });
      capabilities.push(capability);
      allCapabilities.push(capability);
    }

    if (capabilities.length === 0) continue;
    entry.resources.push({
      key: resourceKey,
      name: resource.name,
      ...(resource.description ? { description: resource.description } : {}),
      ...(source ? { source } : {}),
      capabilities,
    });
  }

  const byGroup: RegistryGroup[] = [];
  for (const { group, resources } of groupsByKey.values()) {
    if (resources.length === 0) continue;
    byGroup.push({
      key: group.key,
      name: group.name,
      ...(group.description ? { description: group.description } : {}),
      resources,
      capabilities: resources.flatMap((resource) => resource.capabilities),
    });
  }

  return {
    allCapabilities,
    has: (capability) => descriptions.has(capability),
    describe: (capability) => descriptions.get(capability) ?? null,
    byGroup,
  };
}
