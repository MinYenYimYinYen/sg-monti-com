import mongoose from "mongoose";
import { InventoryCheckDoc } from "@/app/inventory/InventoryTypes";
import { createModel } from "@/lib/mongoose/createModel";

const ProductCountSchema = new mongoose.Schema(
  {
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
    unitQty: { type: Number },
    location: { type: String },
  },
  { _id: false },
);

const InventoryCheckEntrySchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    unit: { type: String, required: true },
    counts: { type: [ProductCountSchema], required: true },
  },
  { _id: false },
);

const InventoryCheckSchema = new mongoose.Schema<InventoryCheckDoc>(
  {
    checkDate: { type: String, required: true },
    entries: { type: [InventoryCheckEntrySchema], required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

// Index for fast "latest check" queries
InventoryCheckSchema.index({ checkDate: -1 });

export const InventoryCheckModel = createModel(
  "InventoryCheck",
  InventoryCheckSchema,
);
