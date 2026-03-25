import mongoose from 'mongoose';
import { LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { createModel } from "@/lib/mongoose/createModel";

const AppMethodSubProductSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  plannedAmount: { type: Number, required: true },
  startAmount: { type: Number, required: true, default: null },
  finishAmount: { type: Number, required: true, default: null },
  unitId: { type: Number, required: true }
}, { _id: false });

const AppMethodSchema = new mongoose.Schema({
  appMethodId: { type: String, required: true },
  mixProductId: { type: Number, required: true },
  mixProductUnitId: { type: Number, required: true },
  plannedAmount: { type: Number, required: true },
  startAmount: { type: Number, required: true, default: null },
  finishAmount: { type: Number, required: true, default: null },
  subProducts: { type: [AppMethodSubProductSchema], required: true }
}, { _id: false });

const MasterSubProductSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  plannedAmount: { type: Number, required: true },
  startAmount: { type: Number, required: true, default: null },
  finishAmount: { type: Number, required: true, default: null },
  unitId: { type: Number, required: true }
}, { _id: false });

const MasterSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  plannedAmount: { type: Number, required: true },
  startAmount: { type: Number, required: true, default: null },
  finishAmount: { type: Number, required: true, default: null },
  unitId: { type: Number, required: true },
  appMethods: { type: [AppMethodSchema], required: true },
  subProducts: { type: [MasterSubProductSchema], required: true }
}, { _id: false });

const LoadoutDocSchema = new mongoose.Schema<LoadoutDoc>({
  employeeId: { type: String, required: true },
  routeDate: { type: String, required: true },
  masters: { type: [MasterSchema], required: true }
});

LoadoutDocSchema.index({ employeeId: 1, routeDate: 1 }, { unique: true });

export const LoadoutDocModel = createModel<LoadoutDoc>('LoadoutDoc', LoadoutDocSchema);