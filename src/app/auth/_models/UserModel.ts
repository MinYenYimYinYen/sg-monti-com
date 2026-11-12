import mongoose from "mongoose";
import { UserWithPW } from "@/app/auth/_types/User";
import { ROLES } from "@/lib/api/types/roles";
import { isValidEmail } from "@/app/auth/_lib/userValidation";

export interface UserDoc extends UserWithPW, mongoose.Document {
}

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: function (v: string) {
          // Same rule the create-user op checks up front, kept in one place
          return isValidEmail(v);
        },
        message: (props: { value: string }) =>
          `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return v.length >= 4;
        },
        message: () => `Password must be at least 4 characters long!`,
      },
    },
    firstName: { type: String, required: true, index: true },
    lastName: { type: String, required: true, index: true },
    userName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: function (v: string) {
          return v.length >= 1 && !v.includes("@");
        },
      },
    },
    role: {
      type: String,
      required: true,
    },
    saId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    // No defaults: absent means false, and the app never writes isSuperUser.
    isSuperUser: { type: Boolean },
    isKiosk: { type: Boolean },
  },
  {
    timestamps: true,
  },
);

const UserModel =
  (mongoose.models?.User as mongoose.Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);

export default UserModel;
