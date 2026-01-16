import { Role } from "@/lib/api/types/roles";

export type TokenPayload = {
  role: Role;
  saId: string;
  mustChangePassword?: boolean;
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
