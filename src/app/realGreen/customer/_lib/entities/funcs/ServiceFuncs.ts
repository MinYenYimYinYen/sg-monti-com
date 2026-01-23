import {
  remapUsedProducts,
  UsedProductRaw,
  UsedProductRemapped,
} from "@/app/realGreen/_lib/subTypes/UsedProduct";
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
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { ProductionRemapped } from "@/app/realGreen/_lib/subTypes/Production";
import { AppError } from "@/lib/errors/AppError";
import { ServiceCore, ServiceRaw } from "../types/ServiceTypes";

function remapProduction({
  invoice,
  servId,
  servStatus,
  historyRaw,
  usedProductsRaw,
  doneBysRaw,
}: {
  invoice: number | null;
  servId: number;
  servStatus: string;
  historyRaw: ServiceHistoryRaw | undefined;
  usedProductsRaw: UsedProductRaw[] | undefined;
  doneBysRaw: DoneByRaw[] | undefined;
}): ProductionRemapped | null {
  if (!(servStatus === "S")) return null;
  if (!historyRaw || !usedProductsRaw || !doneBysRaw || !invoice) {
    throw new AppError({
      message:
        "Completed service has missing data! Please contact your department lead.",
      data: {
        history: !!historyRaw,
        usedProducts: !!usedProductsRaw,
        doneBys: !!doneBysRaw,
        invoice: !!invoice,
      },
    });
  }
  const history: ServiceHistory = remapServiceHistory(historyRaw);
  const usedProducts: UsedProductRemapped[] =
    remapUsedProducts(usedProductsRaw);
  const doneBys: DoneByRemapped[] = remapDoneBys(doneBysRaw);

  const production: ProductionRemapped = {
    ...history,
    usedProducts,
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
    callAheadId: raw.callAhead || null,
    custId: raw.customerNumber,
    discountId: raw.discountCode || null,
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
    production: remapProduction({
      invoice: raw.invoiceNumber,
      servId: raw.id,
      doneBysRaw: raw.doneByEmployees,
      historyRaw: raw.serviceHistory,
      usedProductsRaw: raw.productsUsed,
      servStatus: raw.serviceStatus,
    }),
  };
}

export function remapServices(raw: ServiceRaw[]) {
  return raw.map((r) => remapService(r));
}
