import type { User } from "@/app/auth/_types/User";

/**
 * The verified access-token claims: the server's picture of who is asking. isSuperUser is only
 * a hint here; the server confirms it against the user document. ole goes away with roles.
 */
export type TokenPayload = Pick<
  User,
  "userName" | "saId" | "role" | "mustChangePassword" | "isSuperUser"
>;

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
