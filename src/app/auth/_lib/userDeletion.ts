import type { User } from "@/app/auth/_types/User";

// Pure decision for deleting a user, with the database results passed in so it can be tested.
// No server-only imports.

export type UserDeletionVerdict =
  | { ok: true }
  | { ok: false; reason: "self" | "superUser"; message: string };

/**
 * Whether the signed-in superuser may delete this user. Refuses deleting yourself (a slip that
 * would lock you out) and deleting a superuser. Superuser status is only ever set in the
 * database, so it is also removed there first. That makes the last superuser undeletable.
 */
export function judgeUserDeletion({
  actorUserName,
  target,
}: {
  actorUserName: string;
  target: Pick<User, "userName" | "isSuperUser">;
}): UserDeletionVerdict {
  if (target.userName.toLowerCase() === actorUserName.toLowerCase()) {
    return { ok: false, reason: "self", message: "You cannot delete your own account." };
  }
  // The raw flag, not the effective one: a kiosk carrying the flag is still treated as protected.
  if (target.isSuperUser) {
    return {
      ok: false,
      reason: "superUser",
      message: "A superuser cannot be deleted here. Remove the superuser flag in the database first.",
    };
  }
  return { ok: true };
}
