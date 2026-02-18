import mongoose, { Model, Schema } from "mongoose";

/**
 * Ensures a model is only created once.
 * @param name The name of the model (e.g., "Unit")
 * @param schema The Mongoose schema for the model
 * @returns The existing model or a newly created one
 */
export function createModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);
}
