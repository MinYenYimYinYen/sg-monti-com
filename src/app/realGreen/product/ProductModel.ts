import mongoose from "mongoose";
import { MongoProduct } from "@/app/realGreen/product/Product";

interface ProductDoc extends MongoProduct, mongoose.Document {}

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
