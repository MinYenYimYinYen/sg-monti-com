import mongoose from "mongoose";
import { ProductMasterDocProps } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingleDocProps } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDocProps } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type ProductDocPropsStorage = (Partial<ProductMasterDocProps> &
  Partial<ProductSingleDocProps> &
  Partial<ProductSubDocProps>) &
  CreatedUpdated;

interface ProductDocPropsDoc
  extends ProductDocPropsStorage,
    mongoose.Document {}

const ProductDocPropsSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },

    subProductIds: {
      type: [Number],
      required: false,
      default: undefined,
    },
  },
  { timestamps: true },
);

export const ProductDocPropsModel =
  (mongoose.models?.Product as mongoose.Model<ProductDocPropsDoc>) ||
  mongoose.model<ProductDocPropsDoc>("Product", ProductDocPropsSchema);
