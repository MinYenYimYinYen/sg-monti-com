import { Role } from "@/lib/api/types/roles";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type User = CreatedUpdated & {
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  role: Role;
  saId: string;
};

export type UserWithPW = User & {
  password: string;
};
