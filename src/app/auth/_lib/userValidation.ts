import { Role, ROLES } from "@/lib/api/types/roles";
import { isValidUserName, USER_NAME_RULE_MESSAGE } from "@/app/auth/_lib/userNameUtils";

// Shared by the create-user op and the user model. No server-only imports.

export const EMAIL_PATTERN = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

// The saId goes into an upstream URL path (/Employee/{saId}), so it is limited to a safe
// alphabet, and a value made only of dots (which path normalization would collapse) is refused.
const SA_ID_PATTERN = /^(?!\.+$)[A-Za-z0-9._-]{1,32}$/;

export const SA_ID_RULE_MESSAGE =
  "saId must be 1 to 32 characters: letters, numbers, period, underscore or hyphen, and not only periods.";

export function isValidSaId(saId: string): boolean {
  return SA_ID_PATTERN.test(saId);
}

/** Roles a user can be created with. Temporary: goes away with roles (plan step 7). */
export const USER_ROLES: readonly Role[] = ROLES.filter((role) => role !== "public");

const NAME_MAX_LENGTH = 50;

// Matches the user model and the change-password page.
export const MIN_PASSWORD_LENGTH = 4;
// bcrypt silently ignores everything past 72 bytes, so a longer password would not be what the
// user thinks it is.
const PASSWORD_MAX_BYTES = 72;

// Shown to administrators, so it speaks in characters. The limit is really in bytes, which only
// differs for accented letters and symbols, hence the second sentence.
export const PASSWORD_RULE_MESSAGE = `Password must be ${MIN_PASSWORD_LENGTH} to ${PASSWORD_MAX_BYTES} characters long. Accented letters and symbols can count as more than one.`;

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES;
}

/**
 * The form's password check: the confirmation exists only in the form, so this is the one place
 * it is compared. Returns a message for the first problem, or null when the entry is good.
 */
export function checkPasswordEntry({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}): string | null {
  if (!isValidPassword(password)) return PASSWORD_RULE_MESSAGE;
  if (password !== confirmPassword) return "The password and its confirmation do not match.";
  return null;
}

export type NewUser = {
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  saId: string;
  role: Role;
  isKiosk: boolean;
  /** Plain text, only until the handler hashes it. Never store or log this object. */
  password: string;
  /** The password is temporary: the user is sent to the change-password page at first login. */
  mustChangePassword: boolean;
};

export type CreateUserCheck = { ok: true; value: NewUser } | { ok: false; message: string };

function text(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function refuse(message: string): CreateUserCheck {
  return { ok: false, message };
}

/** The request body is untrusted JSON, so every field is checked for type as well as content. */
export function validateCreateUser(input: unknown): CreateUserCheck {
  if (typeof input !== "object" || input === null) return refuse("The request is missing its fields.");
  const body = input as Record<string, unknown>;

  const userName = text(body.userName);
  if (userName === null || !isValidUserName(userName)) return refuse(USER_NAME_RULE_MESSAGE);

  const email = text(body.email);
  if (email === null || !isValidEmail(email)) {
    return refuse("Enter a valid email address (letters, digits, _ - and . only; a + is not allowed).");
  }

  const firstName = text(body.firstName);
  if (!firstName || firstName.length > NAME_MAX_LENGTH) {
    return refuse(`First name is required (up to ${NAME_MAX_LENGTH} characters).`);
  }
  const lastName = text(body.lastName);
  if (!lastName || lastName.length > NAME_MAX_LENGTH) {
    return refuse(`Last name is required (up to ${NAME_MAX_LENGTH} characters).`);
  }

  const saId = text(body.saId);
  if (saId === null || !isValidSaId(saId)) return refuse(SA_ID_RULE_MESSAGE);

  const role = body.role;
  if (typeof role !== "string" || !USER_ROLES.includes(role as Role)) {
    return refuse(`Role must be one of: ${USER_ROLES.join(", ")}.`);
  }

  if (typeof body.isKiosk !== "boolean") return refuse("isKiosk must be true or false.");

  // Not trimmed: spaces are part of a password.
  const password = body.password;
  if (typeof password !== "string" || !isValidPassword(password)) return refuse(PASSWORD_RULE_MESSAGE);

  if (typeof body.mustChangePassword !== "boolean") return refuse("mustChangePassword must be true or false.");

  return {
    ok: true,
    value: {
      userName,
      email,
      firstName,
      lastName,
      saId,
      role: role as Role,
      isKiosk: body.isKiosk,
      password,
      mustChangePassword: body.mustChangePassword,
    },
  };
}
