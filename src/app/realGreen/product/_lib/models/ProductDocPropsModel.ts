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
  extends ProductDocPropsStorage, mongoose.Document {}

const MasterRateSchema = new mongoose.Schema({
  masterId: { type: Number, required: true },
  rate: { type: Number, required: true },
})

const ProductDocPropsSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },

    subProductIds: {
      type: [Number],
      required: false,
      default: undefined,
    },
    masterRates: [MasterRateSchema]
  },
  { timestamps: true },
);

export const ProductDocPropsModel =
  (mongoose.models?.Product as mongoose.Model<ProductDocPropsDoc>) ||
  mongoose.model<ProductDocPropsDoc>("Product", ProductDocPropsSchema);
