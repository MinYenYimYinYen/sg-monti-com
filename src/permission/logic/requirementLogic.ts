import type { Capability } from "@/permission/PermissionTypes";
import type { RequirementRegistry } from "@/permission/logic/permissionLogicTypes";

// Requirements are an assignment-time aid for the admin screens and never part of an access
// decision: nothing here grants, implies or removes a capability at runtime. The editors offer
// what a capability needs when it is picked, and warn when something it needs is not held.

/**
 * Everything the given capabilities need, transitively, that is not already in the list. The
 * walk keeps a visited set, so a cycle in the declarations cannot loop.
 */
export function expandRequirements({
  capabilities,
  registry,
}: {
  capabilities: readonly Capability[];
  registry: RequirementRegistry;
}): Capability[] {
  const visited = new Set<Capability>(capabilities);
  const needed: Capability[] = [];
  const queue: Capability[] = [...capabilities];

  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const required of registry.requirementsOf(next)) {
      if (visited.has(required)) continue;
      visited.add(required);
      needed.push(required);
      queue.push(required);
    }
  }
  return needed;
}

export type DirectAddPlan = {
  /** The picked capability first, then what it needs that the user lacks and the actor may assign. */
  capabilities: Capability[];
  /** Needed but not offered, because the actor does not hold it and so cannot hand it out. */
  unassignable: Capability[];
};

/**
 * What adding one direct capability would add. `effective` is everything the target already
 * holds (bundles plus direct), so a requirement held through a bundle is not added again, which
 * addDirect would refuse. A non-superuser can only assign what they hold, so a requirement they
 * lack is reported instead of offered.
 */
export function planDirectAdd({
  capability,
  effective,
  actorIsSuperUser,
  actorCapabilities,
  registry,
}: {
  capability: Capability;
  effective: readonly Capability[];
  actorIsSuperUser: boolean;
  actorCapabilities: readonly Capability[];
  registry: RequirementRegistry;
}): DirectAddPlan {
  const held = new Set<Capability>(effective);
  const actorHolds = new Set<Capability>(actorCapabilities);
  const capabilities: Capability[] = [capability];
  const unassignable: Capability[] = [];

  for (const required of expandRequirements({ capabilities: [capability], registry })) {
    if (held.has(required)) continue;
    if (actorIsSuperUser || actorHolds.has(required)) capabilities.push(required);
    else unassignable.push(required);
  }
  return { capabilities, unassignable };
}

export type MissingRequirement = { capability: Capability; missing: Capability };

/**
 * For each capability in a flat list, the capabilities it directly needs that the list lacks.
 * Pass the effective list (bundles plus direct) so a requirement held through a bundle counts.
 * Strings the registry does not know are ignored. Warn-only: nothing blocks or adds anything.
 */
export function findMissingRequirements({
  capabilities,
  registry,
}: {
  capabilities: readonly Capability[];
  registry: RequirementRegistry;
}): MissingRequirement[] {
  const held = new Set<string>(capabilities);
  const warnings: MissingRequirement[] = [];

  for (const capability of capabilities) {
    if (!registry.has(capability)) continue;
    for (const required of registry.requirementsOf(capability)) {
      if (!held.has(required)) warnings.push({ capability, missing: required });
    }
  }
  return warnings;
}

