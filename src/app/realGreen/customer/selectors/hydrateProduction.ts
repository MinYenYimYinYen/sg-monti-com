import {
  Production,
  ProductionCore,
} from "@/app/realGreen/_lib/subTypes/Production";
import {
  ProductCommon,
  ProductCommonDoc,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { baseProductCommon } from "@/app/realGreen/product/_lib/baseProduct";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { DoneBy } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";
import {
  Service,
  ServiceDoc,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

function hydrateProduction(
  productionCore: ProductionCore | null,
  productCommonMap: Map<number, ProductCommon>,
  employeeMap: Map<string, Employee>,
  serviceDoc: ServiceDoc
): Production | null {
  if (!productionCore) return null;
  const usedAppProducts: AppProduct[] = productionCore.usedAppProductCores.map(
    (appProductCore) => {
      const appProduct: AppProduct = {
        ...appProductCore,
        productCommon:
          productCommonMap.get(appProductCore.productId) || baseProductCommon,
      };
      return appProduct;
    },
  );

  const doneBys: DoneBy[] = productionCore.doneByCores.map((core) => {
    const employee = employeeMap.get(core.employeeId) || {...baseEmployee};
    const doneBy: DoneBy = {
      ...core,
      employee,
    };
    return doneBy;
  })

  const production: Production = {
    ...productionCore,
    usedAppProducts,
    doneBys,
    serviceDoc,
  };
  return production;
}

export default hydrateProduction
