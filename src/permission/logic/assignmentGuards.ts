import type { User } from "@/app/auth/_types/User";
import type { Capability } from "@/permission/PermissionTypes";
import type { CapabilityRegistry } from "@/permission/registryTypes";

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

/**
 * The same rule for taking access away: a non-superuser cannot strip a capability they do not
 * hold, so a delegate cannot lock out the people above them. `removing` is what the change would
 * actually take from the user. A string the registry no longer knows grants nothing, and no
 * non-superuser can hold one, so it is exempt: anyone may clean it up.
 */
export function canRemove({
  actorIsSuperUser,
  actorCapabilities,
  removing,
  registry,
}: {
  actorIsSuperUser: boolean;
  actorCapabilities: readonly Capability[];
  removing: readonly Capability[];
  registry: Pick<CapabilityRegistry, "has">;
}): CanAssignResult {
  return canAssign({
    actorIsSuperUser,
    actorCapabilities,
    granting: removing.filter((capability) => registry.has(capability)),
  });
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
