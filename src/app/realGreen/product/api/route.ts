import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { ProductContract } from "@/app/realGreen/product/api/ProductContract";
import {
  ProductRaw,
  ProductsResponse,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import {
  extendProducts,
  remapProducts,
} from "@/app/realGreen/product/_lib/productServerFunc";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { ProductCategoryModel } from "@/app/realGreen/product/_lib/models/ProductCategoryModel";

const handlers: HandlerMap<ProductContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawProducts = await rgApi<ProductRaw[]>({
        path: "/Products",
        method: "GET",
      });

      const productsCore = remapProducts(rawProducts);
      const productsResponse: ProductsResponse = await extendProducts(productsCore);

      return { success: true, payload: productsResponse };
    },
  },

  getCategories: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const categories = await ProductCategoryModel.find();
      return { success: true, payload: categories };
    }
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<ProductContract>;
    const { op, ...params } = body;
    const config = handlers[op];

    if (!config) {
      return NextResponse.json(
        { success: false, message: `Operation '${op}' not supported` },
        { status: 400 },
      );
    }

    await assertRole(config.roles);

    const result = await config.handler(params as any);
    return NextResponse.json(result);
  } catch (e) {
    const error = normalizeError(e);
    console.error(`[API] ${error.type}: ${error.message}`, {
      stack: error.stack,
      data: error.data,
    });

    let status = 500;
    if (error.type === "EXTERNAL_ERROR") status = 502;
    else if (error.type === "VALIDATION_ERROR") status = 400;
    else if (error.type === "AUTH_ERROR") status = 403;

    return NextResponse.json(
      {
        success: false,
        message: error.isOperational ? error.message : "Internal Server Error",
      },
      { status },
    );
  }
}
