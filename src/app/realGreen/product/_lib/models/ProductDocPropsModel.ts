import mongoose from "mongoose";
import { ProductDocPropsStorage } from "@/app/realGreen/product/_lib/types/ProductTypes";

interface ProductDocPropsDoc extends ProductDocPropsStorage, mongoose.Document {}

const ProductDocPropsSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },
    productType: {
      type: String,
      required: true,
      enum: ['single', 'master', 'sub'],
    },
    subProductIds: {
      type: [Number],
      required: false,
      default: undefined,
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { timestamps: false }, // We manage timestamps manually as ISO strings
);

export const ProductDocPropsModel =
  (mongoose.models?.Product as mongoose.Model<ProductDocPropsDoc>) ||
  mongoose.model<ProductDocPropsDoc>("Product", ProductDocPropsSchema);

