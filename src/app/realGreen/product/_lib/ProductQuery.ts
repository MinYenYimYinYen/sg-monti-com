import { BaseQuery } from "@/lib/primatives/typeUtils/BaseQuery";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

export class ProductQuery extends BaseQuery<ProductCommon> {
  constructor(products: ProductCommon[]) {
    super(products);
  }

  protected createInstance(items: ProductCommon[]): this {
    return new ProductQuery(items) as this;
  }
}
