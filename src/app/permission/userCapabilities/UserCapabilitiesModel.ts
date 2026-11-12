import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { UserCapabilitiesDoc } from "@/app/permission/userCapabilities/UserCapabilitiesTypes";

const UserCapabilitiesSchema = new Schema<UserCapabilitiesDoc>(
  {
    userName: { type: String, required: true, unique: true },
    bundleKeys: { type: [String], required: true, default: [] },
    capabilities: { type: [String], required: true, default: [] },
  },
  { timestamps: true },
);

export const UserCapabilitiesModel = createModel<UserCapabilitiesDoc>("UserCapabilities", UserCapabilitiesSchema);
