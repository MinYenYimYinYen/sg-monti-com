import mongoose from "mongoose";
import { ProductDocProps } from "@/app/realGreen/product/_lib/ProductTypes";

interface ProductDocPropsDoc extends ProductDocProps, mongoose.Document {}

const ProductDocPropsSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },
  },
  { timestamps: true },
);

export const ProductDocPropsModel =
  (mongoose.models?.Product as mongoose.Model<ProductDocPropsDoc>) ||
  mongoose.model<ProductDocPropsDoc>("Product", ProductDocPropsSchema);

