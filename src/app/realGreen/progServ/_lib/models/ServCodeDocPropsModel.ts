import mongoose from "mongoose";
import { ServCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProductRuleDoc } from "@/app/realGreen/progServ/_lib/types/ProductRule";

interface ServCodeDocPropsDoc extends ServCodeDocProps, mongoose.Document {}

const ServCodeProductSchema = new mongoose.Schema<ProductRuleDoc>({
  size: { type: Number, required: true },
  sizeOperator: { type: String, required: true },
  productSingleIds: { type: [Number], required: true },
  productMasterIds: { type: [Number], required: true },
}, { _id: false });

const DateRangeSchema = new mongoose.Schema(
  {
    min: { type: String, default: "" },
    max: { type: String, default: "" },
  },
  { _id: false },
);

const ServCodeSchema = new mongoose.Schema<ServCodeDocPropsDoc>(
  {
    servCodeId: { type: String, required: true, unique: true },
    dateRange: { type: DateRangeSchema, default: () => ({ min: "", max: "" }) },
    alwaysAsap: { type: Boolean },
    productRuleDocs: [ServCodeProductSchema],
  },
  { timestamps: true },
);

const ServCodeDocPropsModel =
  (mongoose.models?.ServCodeDocProps as mongoose.Model<ServCodeDocPropsDoc>) ||
  mongoose.model<ServCodeDocPropsDoc>("ServCodeDocProps", ServCodeSchema);

export default ServCodeDocPropsModel;
