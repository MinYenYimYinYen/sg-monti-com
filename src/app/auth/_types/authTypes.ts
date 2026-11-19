import type { User } from "@/app/auth/_types/User";

/**
 * The verified access-token claims: the server's picture of who is asking. isSuperUser is only
 * a hint here; the server confirms it against the user document.
 *
 * hasCapabilities is false for a user nobody has given access yet. It exists so the proxy can
 * keep such a user on the pending page, and it is a UX gate only: the server decides every op
 * from the database. It is fixed when the token is issued, so it goes stale after approval until
 * the user signs in again or runs recheckAccess.
 */
export type TokenPayload = Pick<User, "userName" | "saId" | "mustChangePassword" | "isSuperUser"> & {
  hasCapabilities: boolean;
};

export type CheckedId = {
  checked: boolean;
  isValid: boolean;
  alreadyExists: boolean;
  idChecked: string;
} | null;

export type LoginForm = {
  userName: string;
  password: string;
};

export type RegisterForm = {
  userName: string;
  firstName: string;
  lastName: string;
  saId: string;
  email: string;
  password: string;
  confirmPassword: string;
};
