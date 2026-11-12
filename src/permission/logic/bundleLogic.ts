import { Capability, isValidKey } from "@/permission/PermissionTypes";
import type { BundleGrants, KnownCapabilities, UserGrants } from "@/permission/logic/permissionLogicTypes";

export type SaveBundleResult =
  | {
      ok: true;
      /** The list to store: de-duplicated, in the order the superuser picked. */
      capabilities: Capability[];
      added: Capability[];
      removed: Capability[];
      /** Everyone who holds this bundle, who is affected by the change. */
      holders: string[];
      /** Direct grants to remove from holders because the bundle now lists them. */
      stripDirect: { userName: string; capabilities: Capability[] }[];
    }
  | { ok: false; reason: "invalidKey" }
  | { ok: false; reason: "unknownCapabilities"; unknown: string[] };

/**
 * Validates a bundle for saving and works out what the save changes for existing holders.
 * Unknown capability strings are rejected (not dropped) so a typo cannot be saved silently.
 * `stripDirect` is the full overlap between each holder's direct grants and the new list, so a
 * save also repairs any duplicate left over from an earlier failed write.
 */
export function saveBundle({
  bundleKey,
  capabilities,
  existingBundles,
  users,
  registry,
}: {
  bundleKey: string;
  capabilities: readonly string[];
  existingBundles: readonly BundleGrants[];
  users: readonly UserGrants[];
  registry: KnownCapabilities;
}): SaveBundleResult {
  if (!isValidKey(bundleKey)) return { ok: false, reason: "invalidKey" };

  const unknown = capabilities.filter((capability) => !registry.has(capability));
  if (unknown.length > 0) return { ok: false, reason: "unknownCapabilities", unknown: [...new Set(unknown)] };

  const normalized = [...new Set(capabilities)] as Capability[];
  const previous = existingBundles.find((bundle) => bundle.bundleKey === bundleKey)?.capabilities ?? [];
  const previousSet = new Set<Capability>(previous);
  const normalizedSet = new Set<Capability>(normalized);

  const holders = users.filter((user) => user.bundleKeys.includes(bundleKey));
  const stripDirect = holders
    .map((user) => ({
      userName: user.userName,
      capabilities: user.capabilities.filter((capability) => normalizedSet.has(capability)),
    }))
    .filter((strip) => strip.capabilities.length > 0);

  return {
    ok: true,
    capabilities: normalized,
    added: normalized.filter((capability) => !previousSet.has(capability)),
    removed: previous.filter((capability) => !normalizedSet.has(capability)),
    holders: holders.map((user) => user.userName),
    stripDirect,
  };
}
