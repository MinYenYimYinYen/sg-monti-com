import mongoose from "mongoose";
import { LoadoutDoc } from "@/app/loadout/LoadoutTypes";
import { createModel } from "@/lib/mongoose/createModel";

const ConstituentSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    plannedAmount: { type: Number, required: true },
    startAmount: { type: Number, default: null },
    finishAmount: { type: Number, default: null },
    unitId: { type: Number, required: true },
  },
  { _id: false },
);

const EquipmentEntrySchema = new mongoose.Schema(
  {
    equipmentId: { type: String, required: true },
    appMethodId: { type: String, required: true },
    plannedAmount: { type: Number, required: true },
    startAmount: { type: Number, default: null },
    finishAmount: { type: Number, default: null },
    constituents: { type: [ConstituentSchema], required: true },
  },
  { _id: false },
);

const MasterSubProductSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    plannedAmount: { type: Number, required: true },
    startAmount: { type: Number, default: null },
    finishAmount: { type: Number, default: null },
    unitId: { type: Number, required: true },
  },
  { _id: false },
);

const MasterSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    plannedAmount: { type: Number, required: true },
    startAmount: { type: Number, default: null },
    finishAmount: { type: Number, default: null },
    unitId: { type: Number, required: true },
    equipments: { type: [EquipmentEntrySchema], required: true },
    subProducts: { type: [MasterSubProductSchema], required: true },
  },
  { _id: false },
);

const TopLevelSingleSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    startAmount: { type: Number, default: null },
    finishAmount: { type: Number, default: null },
    unitId: { type: Number, required: true },
  },
  { _id: false },
);

const TopLevelSubProductSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    startAmount: { type: Number, default: null },
    finishAmount: { type: Number, default: null },
    unitId: { type: Number, required: true },
  },
  { _id: false },
);

const LoadoutDocSchema = new mongoose.Schema<LoadoutDoc>({
  employeeId: { type: String, required: true },
  routeDate: { type: String, required: true },
  truckId: { type: String, required: true, default: "" },
  rideOnId: { type: String, required: true, default: "" },
  isStored: { type: Boolean, required: true, default: false },
  masters: { type: [MasterSchema], required: true },
  /** Singles are "unplannable" products added ad-hoc by the tech. */
  singles: { type: [TopLevelSingleSchema], default: [] },
  subProducts: { type: [TopLevelSubProductSchema], default: [] },
});

LoadoutDocSchema.index({ employeeId: 1, routeDate: 1 }, { unique: true });

export const LoadoutDocModel = createModel<LoadoutDoc>(
  "LoadoutDoc",
  LoadoutDocSchema,
);
