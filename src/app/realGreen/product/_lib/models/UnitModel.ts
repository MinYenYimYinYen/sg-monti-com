import mongoose from "mongoose";
import {
  UnitStorage,
} from "@/app/realGreen/product/unitConfig/UnitTypes";

interface UnitDoc extends mongoose.Document, UnitStorage {}

const UnitSchema = new mongoose.Schema<UnitDoc>({
  unitId: { type: Number, required: true, unique: true },
  metric: { type: String, required: true },
  desc: { type: String, required: true },
})

export const UnitModel =
  (mongoose.models?.Unit as mongoose.Model<UnitDoc>) ||
  mongoose.model<UnitDoc>("Unit", UnitSchema);
