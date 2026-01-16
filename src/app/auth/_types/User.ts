import {Role} from "@/lib/api/types/roles";

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  role: Role;
  saId: string;
  mustChangePassword?: boolean;
}

export interface UserWithPW extends User {
  password: string;
}
