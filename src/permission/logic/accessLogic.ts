import type { User } from "@/app/auth/_types/User";
import { isSuperUserEffective } from "@/permission/PermissionTypes";
import type { Capability } from "@/permission/PermissionTypes";
import { resolveEffective } from "@/permission/logic/resolveEffective";
import type { BundleGrants, KnownCapabilities, UserGrants } from "@/permission/logic/permissionLogicTypes";

// Whether a user holds any access at all. A user with none is "pending": signed in, but nothing
// passes for them until an administrator assigns capabilities. There is no stored marker for the
// state, so it is computed from what the user holds.

export type AccessUser = Pick<User, "userName" | "isSuperUser" | "isKiosk">;

/** `capabilities` must be the resolved list (resolveEffective), so stale strings do not count. */
export function holdsAnyAccess({
  user,
  capabilities,
}: {
  user: Pick<User, "isSuperUser" | "isKiosk">;
  capabilities: readonly Capability[];
}): boolean {
  return isSuperUserEffective(user) || capabilities.length > 0;
}

/** The names of the users who hold any access. A user with no holdings document holds none. */
export function userNamesWithAccess({
  users,
  holdings,
  bundles,
  registry,
}: {
  users: readonly AccessUser[];
  holdings: readonly UserGrants[];
  bundles: readonly BundleGrants[];
  registry: KnownCapabilities;
}): Set<string> {
  const holdingsByUserName = new Map(holdings.map((held) => [held.userName, held]));
  const namesWithAccess = new Set<string>();

  for (const user of users) {
    const held = holdingsByUserName.get(user.userName);
    const capabilities = held
      ? resolveEffective({
          bundleKeys: held.bundleKeys,
          directCapabilities: held.capabilities,
          bundles,
          registry,
        })
      : [];
    if (holdsAnyAccess({ user, capabilities })) namesWithAccess.add(user.userName);
  }
  return namesWithAccess;
}

/** Users waiting for access. A kiosk is a shared-device account, not someone waiting to be approved. */
export function filterPendingUsers<T extends AccessUser>({
  users,
  namesWithAccess,
}: {
  users: readonly T[];
  namesWithAccess: ReadonlySet<string>;
}): T[] {
  return users.filter((user) => !user.isKiosk && !namesWithAccess.has(user.userName));
}
