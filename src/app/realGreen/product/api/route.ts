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
import { Grouper } from "@/lib/Grouper";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { UnitModel } from "@/app/realGreen/product/_lib/models/UnitModel";
import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";

const handlers: HandlerMap<ProductContract> = {
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
      const units: Unit[] = cleanMongoArray(unitDocs) as Unit[];
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
        throw new AppError({ message: "Error saving category" });
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
          isOperational: true,
          data: { originalError: error },
        });
      }

      // 2. Business Logic Validation (Now OUTSIDE the try block)
      if (!result || !result.productId) {
        throw new AppError({
          message: `Failed to save master sub products for masterId ${masterId}: result was null`,
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
      console.log("Saving unit:", unit);
      const result = await UnitModel.findOneAndUpdate(
        { unitId: unit.unitId },
        { ...unit },
        { upsert: true, new: true },
      ).lean();
      if (result.unitId) {
        return { success: true };
      } else {
        throw new AppError({ message: "Error saving unit" });
      }
    },
  },
};

export const POST = createRpcHandler(handlers);
