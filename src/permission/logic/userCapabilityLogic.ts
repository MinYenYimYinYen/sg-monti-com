import type { Capability } from "@/permission/PermissionTypes";
import type { BundleGrants, KnownCapabilities, UserGrants } from "@/permission/logic/permissionLogicTypes";
import { resolveEffective } from "@/permission/logic/resolveEffective";

// Every function here is pure: it returns the new lists and never mutates its input. The
// invariant they keep is "a direct grant never duplicates a capability a held bundle lists
// literally", so that removing a bundle behaves predictably. Redundancy is exact string
// containment: a direct `x.read` is NOT redundant next to a bundle's `x.write`.

export type Holdings = Pick<UserGrants, "bundleKeys" | "capabilities">;

/** Every capability listed by the bundles the user holds. */
export function bundleCapabilitiesHeld({
  bundleKeys,
  bundles,
}: {
  bundleKeys: readonly string[];
  bundles: readonly BundleGrants[];
}): Set<Capability> {
  const held = new Set<Capability>();
  for (const bundle of bundles) {
    if (bundleKeys.includes(bundle.bundleKey)) bundle.capabilities.forEach((capability) => held.add(capability));
  }
  return held;
}

// ---------- assign / remove a bundle ----------
export type AssignBundleResult =
  | { ok: true; bundleKeys: string[]; capabilities: Capability[]; removedDirect: Capability[] }
  | { ok: false; reason: "unknownBundle" | "alreadyAssigned" };

/** Adds the bundle and drops the direct grants it already lists, so none are left duplicated. */
export function assignBundle({
  user,
  bundleKey,
  bundles,
}: {
  user: Holdings;
  bundleKey: string;
  bundles: readonly BundleGrants[];
}): AssignBundleResult {
  const bundle = bundles.find((candidate) => candidate.bundleKey === bundleKey);
  if (!bundle) return { ok: false, reason: "unknownBundle" };
  if (user.bundleKeys.includes(bundleKey)) return { ok: false, reason: "alreadyAssigned" };

  const covered = new Set(bundle.capabilities);
  return {
    ok: true,
    bundleKeys: [...user.bundleKeys, bundleKey],
    capabilities: user.capabilities.filter((capability) => !covered.has(capability)),
    removedDirect: user.capabilities.filter((capability) => covered.has(capability)),
  };
}

export type RemoveBundleResult =
  | { ok: true; bundleKeys: string[]; lost: Capability[] }
  | { ok: false; reason: "notAssigned" };

/**
 * Removes the bundle. `lost` is what the user actually loses: their effective capabilities
 * before minus after, so anything they still hold directly or through another bundle is not
 * counted. Direct grants are never touched.
 */
export function removeBundle({
  user,
  bundleKey,
  bundles,
  registry,
}: {
  user: Holdings;
  bundleKey: string;
  bundles: readonly BundleGrants[];
  registry: KnownCapabilities;
}): RemoveBundleResult {
  if (!user.bundleKeys.includes(bundleKey)) return { ok: false, reason: "notAssigned" };

  const bundleKeys = user.bundleKeys.filter((key) => key !== bundleKey);
  const before = resolveEffective({
    bundleKeys: user.bundleKeys,
    directCapabilities: user.capabilities,
    bundles,
    registry,
  });
  const after = new Set(resolveEffective({ bundleKeys, directCapabilities: user.capabilities, bundles, registry }));

  return { ok: true, bundleKeys, lost: before.filter((capability) => !after.has(capability)) };
}

// ---------- direct (custom) grants ----------
export type AddDirectResult =
  | { ok: true; capabilities: Capability[] }
  | { ok: false; reason: "unknownCapability" | "alreadyDirect" | "coveredByBundle" };

/** `capability` is untrusted input (it arrives from the client), so it is checked, not assumed. */
export function addDirect({
  user,
  capability,
  bundles,
  registry,
}: {
  user: Holdings;
  capability: string;
  bundles: readonly BundleGrants[];
  registry: KnownCapabilities;
}): AddDirectResult {
  if (!registry.has(capability)) return { ok: false, reason: "unknownCapability" };
  const known = capability as Capability;
  if (user.capabilities.includes(known)) return { ok: false, reason: "alreadyDirect" };
  if (bundleCapabilitiesHeld({ bundleKeys: user.bundleKeys, bundles }).has(known)) {
    return { ok: false, reason: "coveredByBundle" };
  }
  return { ok: true, capabilities: [...user.capabilities, known] };
}

export type RemoveDirectResult =
  | { ok: true; capabilities: Capability[] }
  | { ok: false; reason: "notDirect" };

/** Works on any stored string, including a stale one the registry no longer knows, so it can be cleaned up. */
export function removeDirect({ user, capability }: { user: Holdings; capability: string }): RemoveDirectResult {
  if (!user.capabilities.some((held) => held === capability)) return { ok: false, reason: "notDirect" };
  return { ok: true, capabilities: user.capabilities.filter((held) => held !== capability) };
}
