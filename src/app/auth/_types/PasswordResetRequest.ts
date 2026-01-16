import { User } from "@/app/auth/_types/User";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type PasswordResetStatus = "pending" | "resolved";
export type PasswordResetRequest = Pick<
  User,
  "userName" | "saId" | "firstName" | "lastName"
> &
  CreatedUpdated & {
    status: PasswordResetStatus;
  };
