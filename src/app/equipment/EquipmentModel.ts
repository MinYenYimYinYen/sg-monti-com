import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";

const EquipmentSchema = new mongoose.Schema<EquipmentDoc>(
  {
    equipmentId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    appMethodId: { type: String, required: true },
    mixedProductIds: { type: [Number], default: [] },
  },
  { timestamps: true },
);

export const EquipmentModel = createModel("Equipment", EquipmentSchema);
