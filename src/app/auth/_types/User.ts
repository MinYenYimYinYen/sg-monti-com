import { Role } from "@/lib/api/types/roles";

export type User = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userName: string;
  role: Role;
  saId: string;

  createdAt?: Date;
  updatedAt?: Date;
};
