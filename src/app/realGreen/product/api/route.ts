import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import {
  ProductContract,
  ProductsResponse,
} from "@/app/realGreen/product/api/ProductContract";
import { ProductRaw } from "@/app/realGreen/product/_lib/types/ProductTypes";

import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { ProductCategoryModel } from "@/app/realGreen/product/_lib/models/ProductCategoryModel";
import { AppError } from "@/lib/errors/AppError";
import {
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

const handlers: HandlerMap<ProductContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawProducts = await rgApi<ProductRaw[]>({
        path: "/Products",
        method: "GET",
      });

      const { masterCores, singleCores, subCores, productCores } =
        // product Cores is unused.  I'm leaving it available here in case
        // it is needed in the future.
        // productCores is just raw products remapped.
        remapRawProducts(rawProducts);

      await connectToMongoDB();
      const storedProductDocProps = await ProductDocPropsModel.find({}).lean();
      const productDocProps = cleanMongoArray<ProductDocPropsStorage>(
        storedProductDocProps,
      );

      const masterCoreIds = masterCores.map((p) => p.productId);
      const singleCoreIds = singleCores.map((p) => p.productId);
      const subCoreIds = subCores.map((p) => p.productId);

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

      const categoryDocs = await ProductCategoryModel.find().lean();
      const categories = cleanMongoArray(categoryDocs);
      const categoryMap = new Grouper(categories).toUniqueMap(
        (c) => c.categoryId,
      );

      const masterDocs = extendProductMasters(masterCores, masterDocProps, categoryMap);
      const singleDocs = extendProductSingles(singleCores, singleDocProps, categoryMap);
      const subDocs = extendProductSubs(subCores, subDocProps, categoryMap);

      const productsResponse: ProductsResponse = {
        productMasterDocs: masterDocs,
        productSingleDocs: singleDocs,
        productSubDocs: subDocs,
        productCores: productCores,
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
      await connectToMongoDB();
      const { masterId, subProductIds } = params;
      const result =
        await ProductDocPropsModel.findOneAndUpdate(
          {productId: masterId},
          {subProductIds},
          {upsert: true, new: true}
        ).lean();
      if (result.productId) {
        return { success: true };
      } else {
        throw new AppError({ message: "Error saving master sub products" });
      }
    }
  }
};

export const POST = createRpcHandler(handlers);
