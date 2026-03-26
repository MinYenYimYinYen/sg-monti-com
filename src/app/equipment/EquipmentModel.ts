import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";

const EquipmentSchema = new mongoose.Schema(
  {
    equipmentId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    defaultAppMethodId: { type: String, required: true },
    appMethodIds: { type: [String], default: [] },
    mixedProductIds: { type: [Number], default: [] },
  },
  { timestamps: true },
);

export const EquipmentModel = createModel("Equipment", EquipmentSchema);
