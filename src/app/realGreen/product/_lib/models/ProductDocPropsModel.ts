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

    subProductConfigDocs: {
      type: [
        {
          subId: { type: Number, required: true },
          rate: { type: Number, required: true },
        },
      ],
      required: false,
      default: [],
    },
  },
  { timestamps: true },
);

export const ProductDocPropsModel =
  (mongoose.models?.Product as mongoose.Model<ProductDocPropsDoc>) ||
  mongoose.model<ProductDocPropsDoc>("ProductDocProps", ProductDocPropsSchema);
