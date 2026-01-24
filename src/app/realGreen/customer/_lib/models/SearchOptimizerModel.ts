import { Schema, model, models, Document, Model } from "mongoose";
import { SearchOptimizer } from "../searchUtil/searchSchemes/types/SearchOptimizer";

// This interface represents the Mongoose document structure.
// It extends the base SearchOptimizer type and Mongoose's Document type.
export interface SearchOptimizerDoc
  extends Omit<
      SearchOptimizer,
      "type" | "initialPageCount" | "batchSize" | "lastMaxResponseSize"
    >,
    Document {
  type: "pagination" | "batchSize";
  initialPageCount?: number;
  batchSize?: number;
  lastMaxResponseSize?: number;
}

const DailyUsageSchema = new Schema(
  {
    date: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const SearchOptimizerSchema = new Schema<SearchOptimizerDoc>(
  {
    scheme: { type: String, required: true },
    step: { type: String, required: true },

    // This is the discriminator key for our strategy.
    type: { type: String, required: true, enum: ["pagination", "batchSize"] },

    // Fields for the 'pagination' strategy
    initialPageCount: { type: Number },

    // Fields for the 'batchSize' strategy
    batchSize: { type: Number },
    lastMaxResponseSize: { type: Number },

    // Usage History (Rolling 30 days)
    usageHistory: { type: [DailyUsageSchema], default: [] },
  },
  {
    // This option automatically adds createdAt and updatedAt fields.
    timestamps: true,
  },
);

// A compound index ensures each scheme/step combination is unique and easy to find.
SearchOptimizerSchema.index({ scheme: 1, step: 1 }, { unique: true });

export const SearchOptimizerModel =
  (models.SearchOptimizer as Model<SearchOptimizerDoc>) ||
  model<SearchOptimizerDoc>("SearchOptimizer", SearchOptimizerSchema);
