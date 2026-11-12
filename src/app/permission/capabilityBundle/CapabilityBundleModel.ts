import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { CapabilityBundleDoc } from "@/app/permission/capabilityBundle/CapabilityBundleTypes";

const CapabilityBundleSchema = new Schema<CapabilityBundleDoc>(
  {
    bundleKey: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    // Strings are validated against the capability registry before a save (saveBundle), not here:
    // the registry is application code, and a stored string can outlive a renamed capability.
    capabilities: { type: [String], required: true, default: [] },
  },
  { timestamps: true },
);

export const CapabilityBundleModel = createModel<CapabilityBundleDoc>("CapabilityBundle", CapabilityBundleSchema);
