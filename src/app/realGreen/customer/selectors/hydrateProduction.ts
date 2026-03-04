import {
  Production,
  ProductionCore,
} from "@/app/realGreen/_lib/subTypes/Production";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { baseProductCommon } from "@/app/realGreen/product/_lib/baseProduct";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { DoneBy } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceCondition } from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";

function hydrateProduction({
  productionCore,
  allProductsMap,
  employeeMap,
  serviceDoc,
  serviceConditions,
}: {
  productionCore: ProductionCore | null;
  allProductsMap: Map<number, ProductCommon>;
  employeeMap: Map<string, Employee>;
  serviceDoc: ServiceDoc;
  serviceConditions: ServiceCondition[];
}): Production | null {
  if (!productionCore) return null;
  const usedAppProducts: AppProduct[] = productionCore.usedAppProductCores.map(
    (appProductCore) => {
      const appProduct: AppProduct = {
        ...appProductCore,
        productCommon:
          allProductsMap.get(appProductCore.productId) || baseProductCommon,
      };
      return appProduct;
    },
  );

  const doneBys: DoneBy[] = productionCore.doneByCores.map((core) => {
    const employee = employeeMap.get(core.employeeId) || { ...baseEmployee };
    const doneBy: DoneBy = {
      ...core,
      employee,
    };
    return doneBy;
  });

  const production: Production = {
    ...productionCore,
    usedAppProducts,
    doneBys,
    serviceDoc,
    serviceConditions,
  };
  return production;
}

export default hydrateProduction;
