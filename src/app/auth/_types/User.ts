import {Role} from "@/lib/api/types/roles";

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  role: Role;
  saId: string;
  mustChangePassword?: boolean;
  /** Set in Compass only; no app route writes it. The server confirms it against the document. */
  isSuperUser?: boolean;
  /** Set only by the superuser-only create op. Shared-device account. */
  isKiosk?: boolean;
}

export interface UserWithPW extends User {
  password: string;
}
