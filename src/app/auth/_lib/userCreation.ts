import type { User } from "@/app/auth/_types/User";
import { isProtectedUser } from "@/permission/logic/assignmentGuards";

// Pure decisions for creating a user, with the database and RealGreen results passed in so
// they can be tested. No server-only imports.

// ---------- bogus saId must not belong to a real employee ----------
/** What the RealGreen employee lookup did. Built by lookupEmployeeOutcome (server-only). */
export type EmployeeLookupOutcome =
  | { kind: "returned"; employeeId: string | null | undefined }
  | { kind: "failed"; errorType?: string; statusCode?: number; message: string };

export type BogusSaIdVerdict =
  | { ok: true }
  | { ok: false; reason: "realEmployee" | "lookupFailed"; message: string };

/**
 * A superuser or kiosk user gets a made-up saId, and it must never collide with a real
 * employee. Fails closed: only a clear "no such employee" passes. If RealGreen cannot be asked
 * (network, key, server error) or answers in a way we do not recognize, the user is refused,
 * and the message says what came back so the rule can be adjusted if RealGreen reports an
 * unknown employee differently than assumed.
 */
export function judgeBogusSaId({
  saId,
  outcome,
}: {
  saId: string;
  outcome: EmployeeLookupOutcome;
}): BogusSaIdVerdict {
  if (outcome.kind === "returned") {
    const employeeId = outcome.employeeId?.trim();
    if (employeeId) {
      return {
        ok: false,
        reason: "realEmployee",
        message: `'${saId}' belongs to a real RealGreen employee (${employeeId}). Choose an id that is not a RealGreen employee id.`,
      };
    }
    return { ok: true };
  }

  if (outcome.errorType === "EXTERNAL_ERROR" && outcome.statusCode === 404) return { ok: true };

  const detail = [outcome.errorType, outcome.statusCode, outcome.message].filter((part) => part !== undefined).join(" ");
  return {
    ok: false,
    reason: "lookupFailed",
    message: `Could not confirm with RealGreen that '${saId}' is not a real employee, so the user was not created (${detail}).`,
  };
}

// ---------- no usable password until a reset ----------
/**
 * Stored as the password of a user created without one. It is not a bcrypt hash, so
 * bcrypt.compare answers false for any input (it does not throw), and nobody can log in until a
 * password reset replaces it. It only has to satisfy the model's minimum length.
 */
export const NO_PASSWORD_PLACEHOLDER = "!no-password-set";

// ---------- who may reset a password ----------
/**
 * Resetting a password signs the caller in as that user in effect, so only a superuser may
 * reset a kiosk or superuser. Without this, any admin could take over a superuser, which
 * would defeat the rule that superuser status is controlled in Compass only.
 */
export function canResetPasswordOf({
  target,
  actorIsSuperUser,
}: {
  target: Pick<User, "isSuperUser" | "isKiosk">;
  actorIsSuperUser: boolean;
}): boolean {
  return !isProtectedUser(target) || actorIsSuperUser;
}

// ---------- duplicate keys ----------
/** The field a MongoDB duplicate-key error (code 11000) is about, or null if it is another error. */
export function duplicateKeyField(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const { code, keyPattern, keyValue } = error as { code?: unknown; keyPattern?: unknown; keyValue?: unknown };
  if (code !== 11000) return null;

  const source = keyPattern ?? keyValue;
  if (typeof source === "object" && source !== null) {
    const [field] = Object.keys(source);
    if (field) return field;
  }
  return "unknown";
}

export function duplicateKeyMessage(field: string): string {
  switch (field) {
    case "email":
      return "That email address is already used. Each user needs its own address (nothing is sent to it).";
    case "userName":
      return "That username is already taken.";
    case "saId":
      return "That saId is already in use.";
    default:
      return "A user with one of those values already exists.";
  }
}
