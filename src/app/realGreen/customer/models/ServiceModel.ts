import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { ServiceCore } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

const serviceHistoryCoreSchema = new mongoose.Schema(
  {
    postedBy: { type: String, default: "" },
    feedback: { type: String, default: "" },
    minutes: { type: Number, default: 0 },
    temperature: { type: Number, default: 0 },
    windSpeed: { type: Number, default: 0 },
    timeRange: {
      type: new mongoose.Schema(
        {
          min: { type: String, default: "" },
          max: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: () => ({ min: "", max: "" }),
    },
    doneDate: { type: String, default: "" },
    crewSize: { type: Number, default: 0 },
  },
  { _id: false },
);

const appProductCoreSchema = new mongoose.Schema(
  {
    method: { type: String, default: "" },
    productId: { type: Number, required: true },
    servId: { type: Number, required: true },
    amount: { type: Number, default: 0 },
    treated: { type: Number, default: 0 },
  },
  { _id: false },
);

const doneByCoreSchema = new mongoose.Schema(
  {
    doneById: { type: Number, required: true },
    employeeId: { type: String, default: "" },
    servId: { type: Number, required: true },
    percent: { type: Number, default: 1 },
  },
  { _id: false },
);

const productionCoreSchema = new mongoose.Schema(
  {
    // ServiceHistoryCore fields
    postedBy: { type: String, default: "" },
    feedback: { type: String, default: "" },
    minutes: { type: Number, default: 0 },
    temperature: { type: Number, default: 0 },
    windSpeed: { type: Number, default: 0 },
    timeRange: {
      type: new mongoose.Schema(
        {
          min: { type: String, default: "" },
          max: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: () => ({ min: "", max: "" }),
    },
    doneDate: { type: String, default: "" },
    crewSize: { type: Number, default: 0 },
    // ProductionCore-specific fields
    servId: { type: Number, required: true },
    invoice: { type: Number, required: true },
    usedAppProductCores: { type: [appProductCoreSchema], default: [] },
    doneByCores: { type: [doneByCoreSchema], default: [] },
  },
  { _id: false },
);

const serviceSchema = new mongoose.Schema<ServiceCore>(
  {
    servId: { type: Number, required: true, unique: true },
    asapSince: { type: String, default: "" },
    callAheadId: { type: Number, default: 0 },
    custId: { type: Number, required: true },
    discountId: { type: String, default: "" },
    invoice: { type: Number, default: null },
    isPromised: { type: Boolean, default: false },
    nextPrice: { type: Number, default: 0 },
    nextSize: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    size: { type: Number, default: 0 },
    progId: { type: Number, required: true },
    servCodeId: { type: String, default: "" },
    status: { type: String, default: "" },
    season: { type: Number, required: true },
    techNote: { type: String, default: "" },
    productionCore: { type: productionCoreSchema, default: null },
    round: { type: Number, default: null },
  },
  { timestamps: true },
);

serviceSchema.index({ progId: 1 });
serviceSchema.index({ custId: 1 });
serviceSchema.index({ season: 1 });

export const ServiceModel = createModel<ServiceCore>("Service", serviceSchema);
