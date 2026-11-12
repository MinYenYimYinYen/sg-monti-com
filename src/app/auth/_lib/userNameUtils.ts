// Shared by client validation and server handlers: no server-only imports.

export const USER_NAME_RULE_MESSAGE =
  "Username must be 3 to 32 characters: letters, numbers, period, underscore or hyphen.";

// Applied at registration only. Existing usernames are not re-validated, so they keep working.
const USER_NAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;

export function isValidUserName(userName: string): boolean {
  return USER_NAME_PATTERN.test(userName);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive whole-string match that treats the input as literal text, not a pattern. */
export function exactMatchIgnoreCase(text: string): RegExp {
  return new RegExp(`^${escapeRegExp(text)}$`, "i");
}
