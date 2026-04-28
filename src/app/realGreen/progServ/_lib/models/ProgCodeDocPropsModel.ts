import mongoose from "mongoose";
import { ProgCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { createModel } from "@/lib/mongoose/createModel";

const ProgCodeDocPropsSchema = new mongoose.Schema<ProgCodeDocProps>({
  progCodeId: { type: String, required: true, unique: true },
  precludedIds: { type: [String], required: true, default: [] },
  prefPriceTableId: { type: Number, default: null },
  econPriceTableId: { type: Number, default: null },
  minForPreferred: { type: Number, default: null },
  isInstallment: { type: Boolean, default: false },

});

export const ProgCodeDocPropsModel = createModel(
  "ProgCodeDocProps",
  ProgCodeDocPropsSchema,
);
