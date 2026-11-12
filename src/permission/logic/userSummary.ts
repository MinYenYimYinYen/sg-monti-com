import type { User } from "@/app/auth/_types/User";

// What the permission screens need to know about a user. An explicit field copy (never a spread),
// so the password hash and anything else on the user document can never leak through it.

export type UserSummary = Pick<User, "userName" | "firstName" | "lastName" | "saId" | "role"> & {
  isSuperUser: boolean;
  isKiosk: boolean;
};

export function toUserSummary(
  user: Pick<User, "userName" | "firstName" | "lastName" | "saId" | "role" | "isSuperUser" | "isKiosk">,
): UserSummary {
  return {
    userName: user.userName,
    firstName: user.firstName,
    lastName: user.lastName,
    saId: user.saId,
    role: user.role,
    isSuperUser: !!user.isSuperUser,
    isKiosk: !!user.isKiosk,
  };
}

/** Last name, then first name, then username, ignoring case. Returns a new list. */
export function sortUserSummaries(users: readonly UserSummary[]): UserSummary[] {
  return [...users].sort(
    (first, second) =>
      first.lastName.localeCompare(second.lastName, undefined, { sensitivity: "base" }) ||
      first.firstName.localeCompare(second.firstName, undefined, { sensitivity: "base" }) ||
      first.userName.localeCompare(second.userName, undefined, { sensitivity: "base" }),
  );
}

/** Case-insensitive match on name, username or saId. Empty search matches everyone. */
export function matchesUserSearch({ user, search }: { user: UserSummary; search: string }): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [user.firstName, user.lastName, `${user.firstName} ${user.lastName}`, user.userName, user.saId].some(
    (field) => field.toLowerCase().includes(needle),
  );
}
