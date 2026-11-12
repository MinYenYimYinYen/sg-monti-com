import type { User } from "@/app/auth/_types/User";
import type { Capability } from "@/permission/PermissionTypes";
import type { KnownCapabilities } from "@/permission/logic/permissionLogicTypes";

// ---------- who may assign what ----------
export type CanAssignResult = { allowed: true } | { allowed: false; missing: Capability[] };

/**
 * A superuser may assign anything. Anyone else can only hand out capabilities they hold
 * themselves, so assigning cannot be used to escalate. `granting` is what the assignment would
 * give: a direct capability, or every capability of a bundle.
 */
export function canAssign({
  actorIsSuperUser,
  actorCapabilities,
  granting,
}: {
  actorIsSuperUser: boolean;
  actorCapabilities: readonly Capability[];
  granting: readonly Capability[];
}): CanAssignResult {
  if (actorIsSuperUser) return { allowed: true };
  const held = new Set(actorCapabilities);
  const missing = granting.filter((capability) => !held.has(capability));
  return missing.length === 0 ? { allowed: true } : { allowed: false, missing };
}

/** A kiosk or superuser: only a superuser may change what protects or empowers it. */
export function isProtectedUser(target: Pick<User, "isSuperUser" | "isKiosk">): boolean {
  return !!target.isSuperUser || !!target.isKiosk;
}

/** Only a superuser may change the capabilities (or bundles) of a kiosk or superuser. */
export function canManageCapabilitiesOf({
  target,
  actorIsSuperUser,
}: {
  target: Pick<User, "isSuperUser" | "isKiosk">;
  actorIsSuperUser: boolean;
}): boolean {
  return !isProtectedUser(target) || actorIsSuperUser;
}

// ---------- warn-only companions ----------
// A hint for the editors, never a rule: nothing blocks, adds or implies a capability. Many users
// who can write need to read, so an editor can point out when a list has one without the other.
const COMPANION_VERBS: Record<string, readonly string[]> = {
  write: ["read"],
  delete: ["read"],
  readAny: ["read"],
  writeAny: ["readAny"],
  deleteAny: ["readAny", "delete"],
};

export type MissingCompanion = { capability: Capability; missing: Capability };

/**
 * For each capability in a flat list, the companion capabilities the registry declares but the
 * list lacks. A companion the feature never declared is not reported. Pass the effective list
 * (bundles plus direct) so a companion held through a bundle counts.
 */
export function findMissingCompanions({
  capabilities,
  registry,
}: {
  capabilities: readonly Capability[];
  registry: KnownCapabilities;
}): MissingCompanion[] {
  const held = new Set<string>(capabilities);
  const warnings: MissingCompanion[] = [];

  for (const capability of capabilities) {
    if (!registry.has(capability)) continue;
    const verbSeparator = capability.lastIndexOf(".");
    const prefix = capability.slice(0, verbSeparator);
    const verb = capability.slice(verbSeparator + 1);

    for (const companionVerb of COMPANION_VERBS[verb] ?? []) {
      const companion = `${prefix}.${companionVerb}`;
      if (registry.has(companion) && !held.has(companion)) {
        warnings.push({ capability, missing: companion as Capability });
      }
    }
  }
  return warnings;
}
