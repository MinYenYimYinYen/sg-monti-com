import mongoose from "mongoose";

interface ProductCategoryDoc extends mongoose.Document, ProductCategory {}

const ProductCategorySchema = new mongoose.Schema<ProductCategoryDoc>({
  categoryId: { type: Number, required: true, unique: true },
  category: { type: String, required: true },
});

export const ProductCategoryModel =
  (mongoose.models?.ProductCategory as mongoose.Model<ProductCategoryDoc>) ||
  mongoose.model<ProductCategoryDoc>("ProductCategory", ProductCategorySchema);