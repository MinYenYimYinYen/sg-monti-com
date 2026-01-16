import mongoose from "mongoose";
import { UserWithPW } from "@/app/auth/_types/User";
import { ROLES } from "@/lib/api/types/roles";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { RawEmployee } from "@/app/realGreen/employee/Employee";

export interface UserDoc extends UserWithPW, mongoose.Document {}

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: function (v: string) {
          // Regular expression for basic email format validation
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
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
      enum: Object.values(ROLES),
    },
    saId: {
      type: String,
      default: null,
      unique: true,
      validate: {
        validator: validateSAId,
        message: (props: { value: string }) =>
          `${props.value} is not a valid SA ID!`,
      },
    },
  },
  {
    timestamps: true,
  },
);

async function validateSAId(saId: string): Promise<boolean> {
  const response = await rgApi<RawEmployee[]>({
    path: "/Employee/Active/true",
    method: "GET",
  });

  const saIds = response.map((employee) => employee.id.trim().toLowerCase());
  return saIds.includes(saId.toLowerCase());
}

const UserModel =
  (mongoose.models?.User as mongoose.Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);

export default UserModel;
