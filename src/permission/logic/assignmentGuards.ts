import type { User } from "@/app/auth/_types/User";
import type { Capability } from "@/permission/PermissionTypes";

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
