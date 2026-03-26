import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

const EquipmentPackageSchema = new mongoose.Schema<EquipmentPackageDoc>(
  {
    packageId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    equipmentIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const EquipmentPackageModel = createModel(
  "EquipmentPackage",
  EquipmentPackageSchema,
);
