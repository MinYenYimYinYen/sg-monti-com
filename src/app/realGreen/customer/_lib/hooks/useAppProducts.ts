import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";

export function useAppProducts() {
  const getPlannedAppProductTotal = (services: Service[]) => {
    const products = services.flatMap((service) => service.productsPlanned);
    const productMap = new Grouper(products)
      .groupBy((product) => product.productId)
      .toMap();

    return [...productMap.keys()].map((productId) => {
      const products = productMap.get(productId)!;
      const appProduct: AppProduct = products.reduce(
        (acc, product) => ({
          ...acc,
          amount: acc.amount + product.amount,
          size: acc.size + product.size,
        }),
        { ...products[0] },
      );
      return appProduct;
    });
  };

  return { getPlannedAppProductTotal };
}
