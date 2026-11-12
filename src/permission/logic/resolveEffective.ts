import type { Capability } from "@/permission/PermissionTypes";
import type { BundleGrants, KnownCapabilities } from "@/permission/logic/permissionLogicTypes";

/**
 * A user's effective capabilities: the plain union of their bundles' capabilities and their
 * direct grants, de-duplicated (first occurrence wins, so bundles come before direct grants).
 *
 * Nothing is added or inferred: `x.write` does not bring `x.read`. Strings the registry does not
 * know (renamed or removed) are dropped, and a bundle key with no matching bundle is ignored.
 * This is the only place a user's access is computed, so the "direct grants never duplicate a
 * bundle" rule is for predictable removal only and is never relied on here.
 */
export function resolveEffective({
  bundleKeys,
  directCapabilities,
  bundles,
  registry,
}: {
  bundleKeys: readonly string[];
  directCapabilities: readonly Capability[];
  bundles: readonly BundleGrants[];
  registry: KnownCapabilities;
}): Capability[] {
  const bundlesByKey = new Map(bundles.map((bundle) => [bundle.bundleKey, bundle]));
  const effective = new Set<Capability>();

  for (const bundleKey of bundleKeys) {
    for (const capability of bundlesByKey.get(bundleKey)?.capabilities ?? []) {
      if (registry.has(capability)) effective.add(capability);
    }
  }
  for (const capability of directCapabilities) {
    if (registry.has(capability)) effective.add(capability);
  }

  return [...effective];
}
