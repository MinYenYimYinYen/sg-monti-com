import mongoose from "mongoose";
import { ProductMasterDocProps } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingleDocProps } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDocProps } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { createModel } from "@/lib/mongoose/createModel";

export type ProductDocPropsStorage = (Partial<ProductMasterDocProps> &
  Partial<ProductSingleDocProps> &
  Partial<ProductSubDocProps>) &
  CreatedUpdated;

// Sub-schema for SubProductConfigDoc (ProductMasterDocProps)
const SubProductConfigDocSchema = new mongoose.Schema(
  {
    subId: { type: Number, required: true },
    storedRate: { type: Number, required: true, default: 0 },
    mixedByEquipmentIds: { type: [String], default: [] },
  },
  { _id: false },
);

const ProductDocPropsSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },

    // ProductMasterDocProps fields
    subProductConfigDocs: {
      type: [SubProductConfigDocSchema],
      default: [],
    },
    equipmentPackageIds: {
      type: [String],
      default: [],
    },
    defaultPackageId: {
      type: String,
      default: null,
    },

    // ProductSubDocProps fields
    appMethodId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export const ProductDocPropsModel = createModel("ProductDocProps", ProductDocPropsSchema);
