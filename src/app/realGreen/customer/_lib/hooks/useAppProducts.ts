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
      // Start from index 1 since products[0] is already used as the initial accumulator
      const appProduct: AppProduct = products.slice(1).reduce(
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
