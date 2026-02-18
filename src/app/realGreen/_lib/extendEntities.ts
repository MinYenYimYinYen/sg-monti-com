import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { Model } from "mongoose";

/**
 * Generic configuration for extending entities with MongoDB data
 */
export type ExtendConfig<TCore, TDocProps, TDoc> = {
  /** Array of core entities to extend */
  cores: TCore[];
  /** Optional Mongoose model for fetching DocProps */
  model?: Model<TDocProps>;
  /** Name of the ID field to query and map by (e.g., "flagId", "employeeId") */
  idField: keyof TCore & keyof TDocProps & string;
  /** Base/fallback DocProps to use when no MongoDB document exists */
  baseDocProps: TDocProps;
};

/**
 * Generic function to extend entity cores with MongoDB DocProps data.
 *
 * This provides a single source of truth for how realGreen entities are extended:
 * 1. If a model is provided: connects to MongoDB, fetches DocProps, and merges with cores
 * 2. If no model: simply casts cores to Doc type (for entities without MongoDB storage)
 *
 * @example
 * // With MongoDB model:
 * const flagDocs = await extendEntities({
 *   cores: flagCores,
 *   model: FlagDocPropsModel,
 *   idField: "flagId",
 *   baseDocProps: baseFlagDocProps,
 * });
 *
 * @example
 * // Without MongoDB model (simple cast):
 * const productDocs = await extendEntities({
 *   cores: productCores,
 *   idField: "productId",
 *   baseDocProps: {} as ProductDocProps,
 * });
 */
export async function extendEntities<TCore, TDocProps, TDoc extends TCore & TDocProps>(
  config: ExtendConfig<TCore, TDocProps, TDoc>
): Promise<TDoc[]> {
  const { cores, model, idField, baseDocProps } = config;

  // If no model provided, simply cast to Doc type
  if (!model) {
    return cores as unknown as TDoc[];
  }

  // Connect to MongoDB and fetch DocProps
  await connectToMongoDB();

  const ids = cores.map((core) => core[idField] as string | number);
  const docPropDocs = await model.find({
    [idField]: { $in: ids },
  }).lean();

  // cleanMongoArray removes _id and __v, but idField remains
  const docProps = cleanMongoArray(docPropDocs as TDocProps[]) as TDocProps[];
  const docPropMap = new Grouper(docProps).toUniqueMap(
    (docProp) => docProp[idField] as string | number
  );

  // Merge cores with DocProps (or base fallback)
  const docs: TDoc[] = cores.map((core) => {
    const doc: TDoc = {
      ...core,
      ...(docPropMap.get(core[idField] as string | number) || baseDocProps),
      // Ensure the ID from core is preserved (baseDocProps might have a default/invalid ID)
      [idField]: core[idField],
    } as TDoc;
    return doc;
  });

  return docs;
}
