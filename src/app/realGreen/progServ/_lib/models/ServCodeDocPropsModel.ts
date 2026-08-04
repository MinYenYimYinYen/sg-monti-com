import mongoose from "mongoose";
import { ServCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProductRuleDoc } from "@/app/realGreen/progServ/_lib/types/ProductRule";
import { createModel } from "@/lib/mongoose/createModel";

const ServCodeProductSchema = new mongoose.Schema<ProductRuleDoc>({
  size: { type: Number, required: true },
  sizeOperator: { type: String, required: true },
  productMasterIds: { type: [Number], required: true },
}, { _id: false });

const DateRangeSchema = new mongoose.Schema(
  {
    min: { type: String, default: "" },
    max: { type: String, default: "" },
  },
  { _id: false },
);

const ServCodeSchema = new mongoose.Schema<ServCodeDocProps>(
  {
    servCodeId: { type: String, required: true, unique: true },
    dateRange: { type: DateRangeSchema, default: () => ({ min: "", max: "" }) },
    alwaysAsap: { type: Boolean },
    productRuleDocs: [ServCodeProductSchema],
    callAheadTag: { type: String, default: null },
    paddingDays: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const ServCodeDocPropsModel = createModel<ServCodeDocProps>("ServCodeDocProps", ServCodeSchema);

export default ServCodeDocPropsModel;
