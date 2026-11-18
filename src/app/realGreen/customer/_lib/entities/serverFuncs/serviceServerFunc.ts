import { AppProductCore, AppProductRaw, remapAppProducts } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { remapServiceHistory, ServiceHistory, ServiceHistoryRaw } from "@/app/realGreen/_lib/subTypes/ServiceHistory";
import { DoneByCore, DoneByRaw, remapDoneBys } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { ProductionCore } from "@/app/realGreen/_lib/subTypes/Production";
import { AppError } from "@/lib/errors/AppError";
import {
  ServiceCore,
  ServiceDoc,
  ServiceRaw,
  ServiceTaxLineCore,
} from "../types/ServiceTypes";
import { TaxSlot } from "@/app/realGreen/taxCode/taxSlot";
// ServiceDoc = ServiceCore — no DocProps extension needed

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

/** A slot the API left empty (both amounts absent) is not a tax line. */
function remapTaxLineCores(raw: ServiceRaw): ServiceTaxLineCore[] {
  const slots: { slot: TaxSlot; taxableAmt: number | null | undefined; taxAmt: number | null | undefined }[] = [
    { slot: 1, taxableAmt: raw.taxableAmount1, taxAmt: raw.taxAmount1 },
    { slot: 2, taxableAmt: raw.taxableAmount2, taxAmt: raw.taxAmount2 },
    { slot: 3, taxableAmt: raw.taxableAmount3, taxAmt: raw.taxAmount3 },
  ];
  return slots.flatMap(({ slot, taxableAmt, taxAmt }) =>
    taxableAmt == null && taxAmt == null ? [] : [{ slot, taxableAmt: taxableAmt ?? 0, taxAmt: taxAmt ?? 0 }],
  );
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
    nextPrice: raw.nextPrice ?? 0 as number,
    nextSize: raw.nextSize ?? 0 as number,
    price: raw.price ?? 0 as number,
    // raw.prepaymentDiscountAmount is a dead field (always 0); prepayAmount is the real discount.
    prepayDiscAmt: raw.prepayAmount ?? null,
    // prepayId: unused, see ServiceTypes.
    taxLineCores: remapTaxLineCores(raw),
    size: raw.size ?? 0 as number,
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
    round: raw.round ?? null,
  };
}

export function remapServices(raw: ServiceRaw[]) {
  return raw.map((r) => remapService(r));
}
export function extendServices(cores: ServiceCore[]): ServiceDoc[] {
  return cores;
}
