import mongoose from "mongoose";
import { ProductCategoryStored } from "@/app/realGreen/product/_lib/types/ProductCategoryTypes";

interface ProductCategoryDoc extends mongoose.Document, ProductCategoryStored {}

const ProductCategorySchema = new mongoose.Schema<ProductCategoryDoc>({
  categoryId: { type: Number, required: true, unique: true },
  category: { type: String, required: true },
});

export const ProductCategoryModel =
  (mongoose.models?.ProductCategory as mongoose.Model<ProductCategoryDoc>) ||
  mongoose.model<ProductCategoryDoc>("ProductCategoryStored", ProductCategorySchema);