import type { Capability } from "@/permission/PermissionTypes";
import type { CapabilityRegistry } from "@/permission/registryTypes";

// Text for the admin screens. Pure, so the grouping and labels can be tested without React.

type Describer = Pick<CapabilityRegistry, "describe">;

/**
 * `resource name (source) · verb`. A string the registry no longer knows is shown exactly as
 * stored.
 */
export function capabilityLabel({ capability, registry }: { capability: string; registry: Describer }): string {
  const description = registry.describe(capability);
  if (!description) return capability;
  const source = description.source ? ` (${description.source})` : "";
  return `${description.resourceName}${source} · ${description.verb}`;
}

export type GroupedCapabilities = { groupKey: string; groupName: string; capabilities: Capability[] };

/**
 * Splits capabilities by the group the admin screens list them under, groups in alphabetical
 * order of their name and each group's capabilities in the order given. Strings the registry
 * does not know come back separately, so a stale grant is visible instead of silently
 * disappearing.
 */
export function groupCapabilitiesByGroup({
  capabilities,
  registry,
}: {
  capabilities: readonly Capability[];
  registry: Describer;
}): { groups: GroupedCapabilities[]; unknown: Capability[] } {
  const groupsByKey = new Map<string, GroupedCapabilities>();
  const unknown: Capability[] = [];

  for (const capability of capabilities) {
    const description = registry.describe(capability);
    if (!description) {
      unknown.push(capability);
      continue;
    }
    const group = groupsByKey.get(description.groupKey) ?? {
      groupKey: description.groupKey,
      groupName: description.groupName,
      capabilities: [],
    };
    group.capabilities.push(capability);
    groupsByKey.set(description.groupKey, group);
  }

  const groups = [...groupsByKey.values()].sort((first, second) => first.groupName.localeCompare(second.groupName));

  return { groups, unknown };
}
