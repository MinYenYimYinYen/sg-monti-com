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

const ProductDocPropsSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },

    subProductConfigDocs: {
      type: [
        {
          subId: { type: Number, required: true },
          storedRate: { type: Number, required: true, default: 0 },
        },
      ],
      required: false,
      default: [],
    },

    equipmentScenarioDocs: {
      type: [
        {
          scenarioId: { type: String, required: true },
          description: { type: String, required: true },
          equipmentEntries: {
            type: [
              {
                equipmentId: { type: String, required: true },
                description: { type: String, required: true },
                appMethodId: { type: String, required: true },
                mixedProductIds: { type: [Number], required: false, default: [] },
              },
            ],
            required: false,
            default: [],
          },
        },
      ],
      required: false,
      default: [],
    },

  },
  { timestamps: true },
);

export const ProductDocPropsModel = createModel("ProductDocProps", ProductDocPropsSchema)
