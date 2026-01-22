import { Schema, model, models, Document } from "mongoose";
import { SearchOptimizer } from "../cpsSearchTypes/SearchOptimizer";

// This interface represents the Mongoose document structure.
// It extends the base SearchOptimizer type and Mongoose's Document type.
export interface ISearchOptimizerDoc extends Omit<SearchOptimizer, 'type' | 'lastRecordCount' | 'optimalBatchSize' | 'currentMaxRecordCount'>, Document {
  type: "pagination" | "batchSize";
  lastRecordCount?: number;
  optimalBatchSize?: number;
  currentMaxRecordCount?: number;
}

const SearchOptimizerSchema = new Schema<ISearchOptimizerDoc>({
  scheme: { type: String, required: true },
  step: { type: String, required: true },

  // This is the discriminator key for our strategy.
  type: { type: String, required: true, enum: ["pagination", "batchSize"] },

  // Fields for the 'pagination' strategy
  lastRecordCount: { type: Number },

  // Fields for the 'batchSize' strategy
  optimalBatchSize: { type: Number },
  currentMaxRecordCount: { type: Number },

  // Metering fields
  totalCalls: { type: Number, default: 0 },
  totalRecords: { type: Number, default: 0 },
  avgDuration: { type: Number, default: 0 },
}, {
  // This option automatically adds createdAt and updatedAt fields.
  timestamps: true,
});

// A compound index ensures each scheme/step combination is unique and easy to find.
SearchOptimizerSchema.index({ scheme: 1, step: 1 }, { unique: true });

export const SearchOptimizerModel = models.SearchOptimizer || model<ISearchOptimizerDoc>("SearchOptimizer", SearchOptimizerSchema);
