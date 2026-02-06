// import {
//   ProductCore,
//   ProductDoc,
//   ProductDocPropsStorage,
//   ProductMasterDoc,
//   ProductRaw,
//   ProductSingleDoc,
//   ProductSubDoc,
// } from "@/app/realGreen/product/_lib/types/ProductTypes";
// import { ProductDocPropsModel } from "@/app/realGreen/product/_lib/models/ProductDocPropsModel";
// import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
// import { ProductCategoryModel } from "@/app/realGreen/product/_lib/models/ProductCategoryModel";
// import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
// import { Grouper } from "@/lib/Grouper";
// import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
// import { baseProductDocPropsStorage } from "@/app/realGreen/product/_lib/baseProduct";
// import { ProductsResponse } from "@/app/realGreen/product/api/ProductContract";
//
// function remapProduct(raw: ProductRaw): ProductCore {
//   return {
//     productId: raw.id,
//     description: raw.description,
//     isLabor: raw.isLabor,
//     isMaster: raw.isMaster,
//     isNonInventory: raw.isNonInventory,
//     isProduction: raw.isProduction,
//     isMobile: raw.availableOnHandheld,
//     isWorkOrder: raw.isWorkOrder,
//     categoryId: raw.productCategoryId,
//     productCode: raw.productCode,
//     unitId: raw.unitofMeasure,
//   };
// }
//
// export function remapProducts(raw: ProductRaw[]): ProductCore[] {
//   return raw.map(remapProduct);
// }
//
// function determineProductType(
//   core: ProductCore,
//   docProps: ProductDocPropsStorage | null,
// ): 'master' | 'sub' | 'single' {
//   // Detect API capabilities
//   const canBeMaster = core.isMaster && core.isProduction && core.isMobile;
//   const canBeSingle = !core.isMaster && core.isProduction && core.isMobile;
//   const canBeSub = !core.isMaster && core.isProduction && !core.isMobile;
//   if(canBeSub) console.log(core.productId);
//
//   // If no stored config, use API capability
//   if (!docProps) {
//     if (canBeMaster) return 'master';
//     if (canBeSub) return 'sub';
//     if (canBeSingle) return 'single';
//     return 'single'; // fallback
//   }
//
//   // Validate stored config against API capability
//   if (docProps.productType === 'master' && canBeMaster) return 'master';
//   if (docProps.productType === 'sub' && canBeSub) return 'sub';
//   if (docProps.productType === 'single' && canBeSingle) return 'single';
//
//   // CONFLICT: API capability changed, fall back to API
//   if (canBeMaster) return 'master';
//   if (canBeSub) return 'sub';
//   if (canBeSingle) return 'single';
//
//   return 'single';
// }
//
// async function getCategoryMap() {
//   const categoryDocs = await ProductCategoryModel.find({}).lean();
//   const categories = cleanMongoArray(categoryDocs);
//   const categoryMap = new Grouper(categories).toUniqueMap((cat) => cat.categoryId);
//   return categoryMap;
// }
//
// async function getProductDocProps() {
//   const allDocProps = await ProductDocPropsModel.find({}).lean();
//   const docPropsMap = new Map<number, ProductDocPropsStorage>(
//     allDocProps.map((doc) => [
//       doc.productId,
//       {
//         productId: doc.productId,
//         productType: doc.productType,
//         subProductIds: doc.subProductIds,
//         createdAt: doc.createdAt || new Date().toISOString(),
//         updatedAt: doc.updatedAt || new Date().toISOString(),
//       },
//     ]),
//   );
//   return docPropsMap;
// }
//
// export async function extendProducts(
//   remapped: ProductCore[],
// ): Promise<ProductsResponse> {
//   // Fetch all stored DocProps
//   await connectToMongoDB();
//   const docPropsMap = await getProductDocProps();
//   const categoryMap = await getCategoryMap();
//   const productDocs: ProductDoc[] = remapped.map(p => {
//     const docProps = docPropsMap.get(p.productId) || baseProductDocPropsStorage;
//     return {
//       ...p,
//       ...docProps,
//       category: categoryMap.get(p.categoryId)?.category || baseStrId,
//       createdAt: "",
//       updatedAt: "",
//     }
//   })
//
//
//   const productMasterDocs: ProductMasterDoc[] = [];
//   const productSingleDocs: ProductSingleDoc[] = [];
//   const productSubDocs: ProductSubDoc[] = [];
//   const bulkOps = [];
//   const now = new Date().toISOString();
//
//   for (const core of remapped) {
//     const storedDocProps = docPropsMap.get(core.productId);
//     const productType = determineProductType(core, storedDocProps || null);
//     const createdAt = storedDocProps?.createdAt || now;
//
//     // Prepare bulk operation
//     const updateDoc: any = {
//       productId: core.productId,
//       productType,
//       updatedAt: now,
//     };
//
//     if (productType === 'master') {
//       updateDoc.subProductIds = storedDocProps?.subProductIds || [];
//     } else {
//       // For non-master types, explicitly unset subProductIds if it exists
//       if (storedDocProps?.subProductIds) {
//         updateDoc.$unset = { subProductIds: '' };
//       }
//     }
//
//     const operation: any = {
//       updateOne: {
//         filter: { productId: core.productId },
//         update: {
//           $set: updateDoc,
//           $setOnInsert: { createdAt },
//         },
//         upsert: true,
//       },
//     };
//
//     // Move $unset to top-level update if it exists
//     if (updateDoc.$unset) {
//       operation.updateOne.update.$unset = updateDoc.$unset;
//       delete updateDoc.$unset;
//     }
//
//     bulkOps.push(operation);
//
//     // Build return objects
//     if (productType === 'master') {
//       productMasterDocs.push({
//         ...core,
//         productType: 'master',
//         subProductIds: storedDocProps?.subProductIds || [],
//         createdAt,
//         updatedAt: now,
//         category: categoryMap.get(core.categoryId)?.category || baseStrId,
//       });
//     } else if (productType === 'single') {
//       productSingleDocs.push({
//         ...core,
//         productType: 'single',
//         createdAt,
//         updatedAt: now,
//         category: categoryMap.get(core.categoryId)?.category || baseStrId,
//       });
//     } else if (productType === 'sub') {
//       productSubDocs.push({
//         ...core,
//         productType: 'sub',
//         createdAt,
//         updatedAt: now,
//         category: categoryMap.get(core.categoryId)?.category || baseStrId,
//       });
//     }
//
//   }
//
//   // Execute bulk write
//   if (bulkOps.length > 0) {
//     await ProductDocPropsModel.bulkWrite(bulkOps);
//   }
//
//   return {
//     productMasterDocs,
//     productSingleDocs,
//     // productDocs, //todo: I think this should return subs.
//     productSubDocs
//   };
// }
