import {
  remapAppProducts,
  AppProductRaw,
  AppProductCore,
} from "@/app/realGreen/_lib/subTypes/AppProduct";
import {
  remapServiceHistory,
  ServiceHistory,
  ServiceHistoryRaw,
} from "@/app/realGreen/_lib/subTypes/ServiceHistory";
import {
  DoneByRaw,
  DoneByRemapped,
  remapDoneBys,
} from "@/app/realGreen/_lib/subTypes/DoneByRemapped";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { ProductionCore } from "@/app/realGreen/_lib/subTypes/Production";
import { AppError } from "@/lib/errors/AppError";
import { ServiceCore, ServiceRaw } from "../types/ServiceTypes";

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
  const doneBys: DoneByRemapped[] = remapDoneBys(doneBysRaw);

  const production: ProductionCore = {
    ...history,
    usedAppProductCores,
    doneBys,
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
