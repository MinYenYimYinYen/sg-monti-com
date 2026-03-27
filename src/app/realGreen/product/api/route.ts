import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import {
  ProductContract,
  ProductsResponse,
} from "@/app/realGreen/product/api/ProductContract";
import {
  ProductCommonDocProps,
  ProductRaw,
} from "@/app/realGreen/product/_lib/types/ProductTypes";

import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { ProductCategoryModel } from "@/app/realGreen/product/_lib/models/ProductCategoryModel";
import { AppError } from "@/lib/errors/AppError";
import {
  extendProductCores,
  extendProductMasters,
  extendProductSingles,
  extendProductSubs,
  remapRawProducts,
} from "@/app/realGreen/product/_lib/productServerFunc";
import {
  ProductDocPropsModel,
  ProductDocPropsStorage,
} from "@/app/realGreen/product/_lib/models/ProductDocPropsModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { baseNumId } from "../../_lib/realGreenConst";
import { ProductMasterDocProps } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingleDocProps } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDocProps } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { UnitModel } from "@/app/realGreen/product/_lib/models/UnitModel";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { AppMethodModel } from "@/app/appMethod/AppMethodModel";
import { WATER_PRODUCT_ID } from "@/app/equipment/waterProduct";

const handlers: HandlerMap<ProductContract> = { // eslint-disable-line @typescript-eslint/no-explicit-any
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawProducts = await rgApi<ProductRaw[]>({
        path: "/Products",
        method: "GET",
      });

      const { masterCores, singleCores, subCores, productCores } =
        remapRawProducts(rawProducts);

      await connectToMongoDB();
      const storedProductDocProps = await ProductDocPropsModel.find({}).lean();
      const productDocProps = cleanMongoArray<ProductDocPropsStorage>(
        storedProductDocProps,
      );

      const masterCoreIds = masterCores.map((p) => p.productId);
      const singleCoreIds = singleCores.map((p) => p.productId);
      const subCoreIds = subCores.map((p) => p.productId);
      const commonCoreIds = productCores.map((p) => p.productId);

      const getDocProps = (coreIds: number[]) => {
        const docProps = productDocProps.filter((docProp) =>
          coreIds.includes(docProp.productId || baseNumId),
        );
        return docProps;
      };

      const masterDocProps = getDocProps(
        masterCoreIds,
      ) as ProductMasterDocProps[];
      const singleDocProps = getDocProps(
        singleCoreIds,
      ) as ProductSingleDocProps[];
      const subDocProps = getDocProps(subCoreIds) as ProductSubDocProps[];
      const commonDocProps = getDocProps(
        commonCoreIds,
      ) as ProductCommonDocProps[];

      const categoryDocs = await ProductCategoryModel.find().lean();
      const categories = cleanMongoArray(categoryDocs);
      const categoryMap = new Grouper(categories).toUniqueMap(
        (c) => c.categoryId,
      );

      const unitDocs = await UnitModel.find().lean();
      const units: UnitCRM[] = cleanMongoArray(unitDocs) as UnitCRM[];
      const unitMap = new Grouper(units).toUniqueMap((u) => u.unitId);

      const masterDocs = extendProductMasters(
        masterCores,
        masterDocProps,
        categoryMap,
        unitMap,
      );
      const singleDocs = extendProductSingles(
        singleCores,
        singleDocProps,
        categoryMap,
        unitMap,
      );
      const subDocs = extendProductSubs(
        subCores,
        subDocProps,
        categoryMap,
        unitMap,
      );
      const commonDocs = extendProductCores(
        productCores,
        commonDocProps,
        categoryMap,
        unitMap,
      ).filter((p) => !masterCoreIds.includes(p.productId));

      const productsResponse: ProductsResponse = {
        productMasterDocs: masterDocs,
        productSingleDocs: singleDocs,
        productSubDocs: subDocs,
        productCommonDocs: commonDocs,
      };

      // One time START
      // Restore: Re-populate subProductConfigDocs from backup data (new clean shape).
      // - Water sub-configs (subId: -2) excluded — now a client-side constant
      // - Only writes to docs where subProductConfigDocs is currently empty (safe to re-run)
      // - Also backfills needsWater / tracksTankLevel on AppMethod docs
      // {
      //   // Step 1: Backfill AppMethod boolean flags
      //   const appMethodBackfill = await AppMethodModel.updateMany(
      //     { $or: [{ needsWater: { $exists: false } }, { tracksTankLevel: { $exists: false } }] },
      //     { $set: { needsWater: true, tracksTankLevel: true } },
      //   );
      //
      //   // Step 2: Restore sub-product data from backup, stripped to new shape.
      //   // Only writes when subProductConfigDocs is currently empty (won't overwrite manual edits).
      //   const backupData: { productId: number; subProductConfigDocs: { subId: number; storedRate: number }[] }[] = [
      //     { productId: 664, subProductConfigDocs: [{ subId: 51, storedRate: 1.3 }] },
      //     { productId: 690, subProductConfigDocs: [{ subId: 643, storedRate: 3.1 }] },
      //     { productId: 663, subProductConfigDocs: [{ subId: 539, storedRate: 2.4 }] },
      //     { productId: 673, subProductConfigDocs: [{ subId: 611, storedRate: 0.1837 }] },
      //     { productId: 671, subProductConfigDocs: [{ subId: 165, storedRate: 0.72 }] },
      //     { productId: 672, subProductConfigDocs: [{ subId: 165, storedRate: 0.18 }] },
      //     { productId: 674, subProductConfigDocs: [{ subId: 56, storedRate: 3 }] },
      //     { productId: 681, subProductConfigDocs: [{ subId: 682, storedRate: 1.44 }] },
      //     { productId: 691, subProductConfigDocs: [{ subId: 342, storedRate: 1.087 }, { subId: 468, storedRate: 0.35 }] },
      //     { productId: 665, subProductConfigDocs: [{ subId: 347, storedRate: 3.5 }] },
      //     { productId: 658, subProductConfigDocs: [{ subId: 358, storedRate: 2.4 }] },
      //     { productId: 659, subProductConfigDocs: [{ subId: 76, storedRate: 0.4 }, { subId: 343, storedRate: 0.3 }] },
      //     { productId: 661, subProductConfigDocs: [{ subId: 76, storedRate: 1 }] },
      //     { productId: 693, subProductConfigDocs: [{ subId: 692, storedRate: 1 }] },
      //     { productId: 652, subProductConfigDocs: [{ subId: 643, storedRate: 3.1 }, { subId: 51, storedRate: 1.3 }] },
      //     { productId: 653, subProductConfigDocs: [{ subId: 643, storedRate: 3.1 }, { subId: 51, storedRate: 0.5 }] },
      //     { productId: 650, subProductConfigDocs: [{ subId: 342, storedRate: 1.087 }, { subId: 51, storedRate: 1.3 }, { subId: 468, storedRate: 0.35 }] },
      //     { productId: 651, subProductConfigDocs: [{ subId: 342, storedRate: 1.087 }, { subId: 468, storedRate: 0.35 }, { subId: 51, storedRate: 0.5 }] },
      //     { productId: 655, subProductConfigDocs: [{ subId: 539, storedRate: 2.4 }, { subId: 51, storedRate: 0.5 }] },
      //     { productId: 654, subProductConfigDocs: [{ subId: 539, storedRate: 2.4 }, { subId: 51, storedRate: 0.5 }] },
      //     { productId: 657, subProductConfigDocs: [{ subId: 342, storedRate: 1.087 }, { subId: 51, storedRate: 1.3 }] },
      //     { productId: 656, subProductConfigDocs: [{ subId: 342, storedRate: 1.087 }, { subId: 51, storedRate: 0.5 }] },
      //     { productId: 669, subProductConfigDocs: [{ subId: 168, storedRate: 5 }] },
      //     { productId: 670, subProductConfigDocs: [{ subId: 168, storedRate: 1.25 }] },
      //     { productId: 678, subProductConfigDocs: [{ subId: 60, storedRate: 2 }] },
      //     { productId: 679, subProductConfigDocs: [{ subId: 112, storedRate: 0.04 }] },
      //     { productId: 680, subProductConfigDocs: [{ subId: 112, storedRate: 0.04 }] },
      //     { productId: 666, subProductConfigDocs: [{ subId: 352, storedRate: 1.45 }, { subId: 668, storedRate: 0.45 }] },
      //     { productId: 667, subProductConfigDocs: [{ subId: 352, storedRate: 1.45 }, { subId: 668, storedRate: 0.45 }] },
      //     { productId: 687, subProductConfigDocs: [{ subId: 142, storedRate: 3.5 }] },
      //     { productId: 677, subProductConfigDocs: [{ subId: 675, storedRate: 3.5 }] },
      //     { productId: 676, subProductConfigDocs: [{ subId: 464, storedRate: 3.5 }] },
      //     { productId: 688, subProductConfigDocs: [{ subId: 61, storedRate: 4.6 }] },
      //     { productId: 689, subProductConfigDocs: [{ subId: 76, storedRate: 4 }] },
      //     { productId: 256, subProductConfigDocs: [{ subId: 76, storedRate: 1 }] },
      //   ];
      //
      //   let productsRestored = 0;
      //
      //   for (const entry of backupData) {
      //     const result = await ProductDocPropsModel.updateOne(
      //       // Only restore if subProductConfigDocs is currently empty
      //       { productId: entry.productId, subProductConfigDocs: { $size: 0 } },
      //       {
      //         $set: {
      //           subProductConfigDocs: entry.subProductConfigDocs,
      //           equipmentPackageIds: [],
      //         },
      //         $unset: { equipmentScenarioDocs: "" },
      //       },
      //     );
      //     if (result.modifiedCount > 0) productsRestored++;
      //   }
      //
      //   // Step 3: Ensure equipmentPackageIds exists on all docs
      //   await ProductDocPropsModel.updateMany(
      //     { equipmentPackageIds: { $exists: false } },
      //     { $set: { equipmentPackageIds: [] } },
      //   );
      //
      //   // Step 4: Remove stale equipmentScenarioDocs from any remaining docs
      //   await ProductDocPropsModel.updateMany(
      //     { equipmentScenarioDocs: { $exists: true } },
      //     { $unset: { equipmentScenarioDocs: "" } },
      //   );
      //
      //   if (appMethodBackfill.modifiedCount > 0 || productsRestored > 0) {
      //     console.log(
      //       `[Restore] AppMethods backfilled: ${appMethodBackfill.modifiedCount} | ` +
      //       `Products restored: ${productsRestored}`,
      //     );
      //   }
      // }
      // One time END


      return { success: true, payload: productsResponse };
    },
  },

  saveCategory: {
    roles: ["admin"],
    handler: async (params) => {
      await connectToMongoDB();
      const result = await ProductCategoryModel.findOneAndUpdate(
        { categoryId: params.categoryId },
        { categoryId: params.categoryId, category: params.category },
        { upsert: true, new: true },
      ).lean();
      if (result.categoryId) {
        return { success: true };
      } else {
        throw new AppError({
          message: "Error saving category",
          type: "SERVER_ERROR",
        });
      }
    },
  },

  saveMasterSubProducts: {
    roles: ["admin"],
    handler: async (params) => {
      const { masterId, subProductConfigDocs } = params;
      let result;

      // 1. Attempt the DB Operation
      try {
        await connectToMongoDB();
        result = await ProductDocPropsModel.findOneAndUpdate(
          { productId: masterId },
          { subProductConfigDocs },
          { upsert: true, new: true },
        ).lean();
      } catch (error) {
        // Catching system-level errors (MongoDB connection, etc.)
        throw new AppError({
          message: `MongoDB error saving master sub products: ${error instanceof Error ? error.message : String(error)}`,
          type: "SERVER_ERROR",
          isOperational: true,
          data: { originalError: error },
        });
      }

      // 2. Business Logic Validation (Now OUTSIDE the try block)
      if (!result || !result.productId) {
        throw new AppError({
          message: `Failed to save master sub products for masterId ${masterId}: result was null`,
          type: "SERVER_ERROR",
          isOperational: true,
          data: { masterId, subProductConfigDocs },
        });
      }

      return { success: true };
    },
  },

  saveUnit: {
    roles: ["admin"],
    handler: async (params) => {
      await connectToMongoDB();
      const { unit } = params;
      const result = await UnitModel.findOneAndUpdate(
        { unitId: unit.unitId },
        { ...unit },
        { upsert: true, new: true },
      ).lean();
      if (result.unitId) {
        return { success: true };
      } else {
        throw new AppError({
          message: "Error saving unit",
          type: "SERVER_ERROR",
        });
      }
    },
  },

  saveMasterEquipmentPackages: {
    roles: ["admin"],
    handler: async (params) => {
      const { masterId, equipmentPackageIds } = params;
      await connectToMongoDB();
      const result = await ProductDocPropsModel.findOneAndUpdate(
        { productId: masterId },
        { equipmentPackageIds },
        { upsert: true, new: true },
      ).lean();
      if (!result || !result.productId) {
        throw new AppError({
          message: `Failed to save equipment packages for masterId ${masterId}`,
          type: "SERVER_ERROR",
          isOperational: true,
        });
      }
      return { success: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
