import {
  Production,
  ProductionCore,
} from "@/app/realGreen/_lib/subTypes/Production";
import { ProductCommonDoc } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { baseProductCommon } from "@/app/realGreen/product/_lib/baseProduct";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { DoneBy } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";

function hydrateProduction(
  productionCore: ProductionCore | null,
  productDocMap: Map<number, ProductCommonDoc>,
  employeeMap: Map<string, Employee>,
): Production | null {
  if (!productionCore) return null;
  const usedAppProducts: AppProduct[] = productionCore.usedAppProductCores.map(
    (appProductCore) => {
      const appProduct: AppProduct = {
        ...appProductCore,
        productCommon:
          productDocMap.get(appProductCore.productId) || baseProductCommon,
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
  };
  return production;
}

export default hydrateProduction
