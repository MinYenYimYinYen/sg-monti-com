import { Schema } from "mongoose";
import { Eta, ServiceEta } from "@/app/scheduling/eta/EtaTypes";
import { createModel } from "@/lib/mongoose/createModel";

const EtaSchema = new Schema<Eta>(
  {
    invoice: { type: Number, required: true },
    eta: { type: String, required: true },
  },
  { _id: false },
);

const ServiceEtaSchema = new Schema<ServiceEta>({
  servId: { type: Number, required: true, unique: true },
  etas: [EtaSchema],
});

export const ServiceEtaModel = createModel("ServiceEta", ServiceEtaSchema);
