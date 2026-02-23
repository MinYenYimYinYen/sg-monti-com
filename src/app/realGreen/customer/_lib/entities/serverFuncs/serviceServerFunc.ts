import { AppProductCore, AppProductRaw, remapAppProducts } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { remapServiceHistory, ServiceHistory, ServiceHistoryRaw } from "@/app/realGreen/_lib/subTypes/ServiceHistory";
import { DoneByCore, DoneByRaw, remapDoneBys } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { ProductionCore } from "@/app/realGreen/_lib/subTypes/Production";
import { AppError } from "@/lib/errors/AppError";
import {
  ServiceCore,
  ServiceDoc,
  ServiceDocProps,
  ServiceRaw,
} from "../types/ServiceTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";
import { ServiceDocPropsModel } from "@/app/realGreen/customer/_lib/models/ServiceDocPropsModel";
import { baseServiceDocProps } from "@/app/realGreen/customer/_lib/entities/bases/baseService";

function remapProduction({
  invoice,
  servId,
  servStatus,
  historyRaw,
  rawAppProducts,
  doneBysRaw,
  doneDate,
}: {
  invoice: number | null;
  servId: number;
  servStatus: string;
  historyRaw: ServiceHistoryRaw | undefined;
  rawAppProducts: AppProductRaw[] | undefined;
  doneBysRaw: DoneByRaw[] | undefined;
  doneDate: string;
}): ProductionCore | null {
  if (!(servStatus === "S")) return null;
  if (!historyRaw || !rawAppProducts || !doneBysRaw || !invoice) {
    throw new AppError({
      message:
        "Completed service has missing data! Please contact your department lead.",
      type: "VALIDATION_ERROR",
      statusCode: 400,
      data: {
        history: !!historyRaw,
        usedProducts: !!rawAppProducts,
        doneBys: !!doneBysRaw,
        invoice: !!invoice,
      },
    });
  }
  const history: ServiceHistory = remapServiceHistory(historyRaw, doneDate);
  const usedAppProductCores: AppProductCore[] = remapAppProducts(rawAppProducts);
  const doneByCores: DoneByCore[] = remapDoneBys(doneBysRaw);

  const production: ProductionCore = {
    ...history,
    usedAppProductCores,
    doneByCores,
    servId,
    invoice,
  };
  return production;
}

function remapService(raw: ServiceRaw): ServiceCore {
  return {
    servId: raw.id,
    asapSince: raw.asapDate || "",
    callAheadId: raw.callAhead || baseNumId,
    custId: raw.customerNumber,
    discountId: raw.discountCode || baseStrId,
    invoice: raw.invoiceNumber || null,
    isPromised: raw.isPromised,
    nextPrice: raw.nextPrice,
    nextSize: raw.nextSize,
    price: raw.price,
    size: raw.size,
    progId: raw.programID,
    season: raw.serviceYear,
    servCodeId: raw.serviceCode || baseStrId,
    status: raw.serviceStatus,
    techNote: raw.technicianNote,
    productionCore: remapProduction({
      invoice: raw.invoiceNumber,
      servId: raw.id,
      doneBysRaw: raw.doneByEmployees,
      historyRaw: raw.serviceHistory,
      rawAppProducts: raw.productsUsed,
      servStatus: raw.serviceStatus,
      doneDate: raw.doneDate,
    }),
  };
}

export function remapServices(raw: ServiceRaw[]) {
  return raw.map((r) => remapService(r));
}
export async function extendServices(
  cores: ServiceCore[],
): Promise<ServiceDoc[]> {
  return extendEntities<ServiceCore, ServiceDocProps, ServiceDoc>({
    cores,
    model: ServiceDocPropsModel,
    idField: "servId",
    baseDocProps: baseServiceDocProps,
  });
}