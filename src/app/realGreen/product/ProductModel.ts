import mongoose from "mongoose";
import { ProductDocProps } from "@/app/realGreen/product/ProductTypes";

interface ProductDoc extends ProductDocProps, mongoose.Document {}

const ProductSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },
  },
  { timestamps: true },
);

const ProductModel =
  (mongoose.models?.Product as mongoose.Model<ProductDoc>) ||
  mongoose.model<ProductDoc>("Product", ProductSchema);

export default ProductModel;
