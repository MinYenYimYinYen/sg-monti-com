import mongoose from "mongoose";
import { PriceTableDoc } from "@/app/realGreen/priceTable/_types/PriceTableTypes";

interface PriceTableDocDoc extends mongoose.Document, PriceTableDoc {}

const PriceRangeDocSchema = new mongoose.Schema(
  {
    priceId: { type: Number, required: true, unique: true },
    tableId: { type: Number, required: true },
    size: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true },
);

const PriceTableDocSchema = new mongoose.Schema(
  {
    tableId: { type: Number, required: true, unique: true },
    desc: { type: String, required: true },
    maxPrice: { type: Number },
    maxSize: { type: Number },
    ranges: [PriceRangeDocSchema],
  },
  {
    timestamps: true,
  },
);

export const PriceTableDocModel =
  (mongoose.models?.PriceTableDoc as mongoose.Model<PriceTableDocDoc>) ||
  mongoose.model<PriceTableDocDoc>("PriceTableDoc", PriceTableDocSchema);
