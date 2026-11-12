import type { Capability } from "@/permission/PermissionTypes";
import type { BundleGrants, GrantableCapabilities, UserGrants } from "@/permission/logic/permissionLogicTypes";
import { resolveEffective } from "@/permission/logic/resolveEffective";
import { bundleCapabilitiesHeld, Holdings } from "@/permission/logic/userCapabilityLogic";

// Read-only logic behind the selectors. The selectors stay thin wrappers around these.

/** Direct grants that a held bundle already lists. Should be empty; non-empty means drift to repair. */
export function redundantDirect({
  user,
  bundles,
}: {
  user: Holdings;
  bundles: readonly BundleGrants[];
}): Capability[] {
  const held = bundleCapabilitiesHeld({ bundleKeys: user.bundleKeys, bundles });
  return user.capabilities.filter((capability) => held.has(capability));
}

/** Every registered capability the user does not already have, by a bundle or directly. */
export function assignableCapabilities({
  user,
  bundles,
  registry,
}: {
  user: Holdings;
  bundles: readonly BundleGrants[];
  registry: GrantableCapabilities;
}): Capability[] {
  const effective = new Set(
    resolveEffective({ bundleKeys: user.bundleKeys, directCapabilities: user.capabilities, bundles, registry }),
  );
  return registry.allCapabilities.filter((capability) => !effective.has(capability));
}

/** Which users hold each bundle. A bundle with holders cannot be deleted. */
export function holdersByBundleKey({
  users,
}: {
  users: readonly Pick<UserGrants, "userName" | "bundleKeys">[];
}): Record<string, string[]> {
  const holders: Record<string, string[]> = {};
  for (const user of users) {
    for (const bundleKey of new Set(user.bundleKeys)) {
      (holders[bundleKey] ??= []).push(user.userName);
    }
  }
  return holders;
}

/**
 * How a bundle compares with the registry: what it lacks (grantable but not listed) and which of
 * its strings are stale (no longer in the registry). For the bundle editor.
 */
export function bundleRegistryDiff({
  bundle,
  registry,
}: {
  bundle: BundleGrants;
  registry: GrantableCapabilities;
}): { lacks: Capability[]; stale: Capability[] } {
  const listed = new Set<Capability>(bundle.capabilities);
  return {
    lacks: registry.allCapabilities.filter((capability) => !listed.has(capability)),
    stale: bundle.capabilities.filter((capability) => !registry.has(capability)),
  };
}
