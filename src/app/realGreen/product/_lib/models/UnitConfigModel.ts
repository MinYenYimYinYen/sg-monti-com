import mongoose from "mongoose";
import {
  ProductUnitConfigStorage,
  UnitConversion,
  baseProductUnitConfig,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";

interface UnitConfigDoc extends mongoose.Document, ProductUnitConfigStorage {}

const UnitConversionSchema = new mongoose.Schema<UnitConversion>(
  {
    context: { type: String, required: true, enum: ["app", "load", "purchase"] },
    unitLabel: { type: String, required: true },
    conversionFactor: { type: Number, required: true },
    baseMetric: {
      type: String,
      required: true,
      enum: ["area", "count", "length", "time", "volume", "weight", "unknown"],
    },
  },
  { _id: false },
);

const UnitConfigSchema = new mongoose.Schema<UnitConfigDoc>(
  {
    productId: { type: Number, required: true, unique: true, index: true },
    conversions: {
      type: Map,
      of: UnitConversionSchema,
      required: true,
      default: () => new Map(Object.entries(baseProductUnitConfig.conversions)),
    } as any, // Mongoose Map type conflicts with Record type - handled at runtime
  },
);


export const UnitConfigModel =
  (mongoose.models?.UnitConfig as mongoose.Model<UnitConfigDoc>) ||
  mongoose.model<UnitConfigDoc>("UnitConfig", UnitConfigSchema);
