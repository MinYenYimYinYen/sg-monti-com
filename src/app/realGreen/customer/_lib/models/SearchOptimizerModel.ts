import { Schema, model, models, Document, Model } from "mongoose";
import { SearchOptimizer } from "../types/searchScheme/SearchOptimizer";

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
