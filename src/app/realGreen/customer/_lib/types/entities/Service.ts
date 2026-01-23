import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";
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
import {
  Production,
  ProductionRemapped,
} from "@/app/realGreen/_lib/subTypes/Production";
import { AppError } from "@/lib/errors/AppError";
import { Program } from "./Program";

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

export type ServiceRaw = {
  // actualManHours?: number;
  // actualManHoursFormatted?: string;
  // actualVsManHoursDifference?: number;
  asapDate?: string;
  // associationCode?: string;
  callAhead: number | null;
  // customerNote?: string;
  // customerNoteExpiration?: string;
  customerNumber: number;
  // dateCalled?: string;
  // /**
  //  * @deprecated use 'doneDate' instead. dateCompleted is always null as of 2024-12-06
  //  * */
  // dateCompleted?: string;
  discountAmount: number;
  discountCode?: string;
  doneByEmployees?: DoneByRaw[];
  doneDate: string;
  // endBefore?: TimeSpan;
  // estimatedManHours?: number;
  // estimatedManHoursFormatted?: string;
  extraDescription?: string;
  id: number;
  invoiceNumber: number | null;
  // invoiceShortMessage?: string;
  // isDependentService: boolean;
  // isPaid: boolean;
  isPromised: boolean;
  // isReversed: boolean;
  // manHourRate?: number;
  // manHoursVariance?: number;
  nextPrice: number;
  nextSize: number;
  // postedDate?: string;
  // prepayAmount?: number;
  // prepayId?: number;
  // prepaymentDiscountAmount: number;
  price: number;
  // productionValue?: number;
  productsUsed?: UsedProductRaw[];
  // programCodeAndDescription?: string;
  programDiscountAmount: number;
  // programDiscountCodeId?: string;
  programID: number;
  // round?: number;
  // scheduledTime?: number;
  serviceCode?: string;
  serviceHistory?: ServiceHistoryRaw;
  // serviceHistoryBillType?: string;
  serviceStatus: string;
  serviceYear: number;
  size: number;
  // soldBy1?: string;
  // soldBy2?: string;
  // soldDate?: string;
  // startAfter?: TimeSpan;
  // startDate?: string;
  // taxAmount1?: number;
  // taxAmount2?: number;
  // taxAmount3?: number;
  // taxableAmount1?: number;
  // taxableAmount2?: number;
  // taxableAmount3?: number;
  technicianNote: string;
  // technicianNoteExpiration?: string;
  // timestamp?: number;
  // totalAmount?: number;
  // varianceManHoursFormatted?: string;
};

export type ServiceCore = {
  servId: number;
  asapSince: string;
  callAheadId: number | null;
  custId: number;
  discountId: string | null;
  invoice: number | null;
  isPromised: boolean;
  nextPrice: number;
  nextSize: number;
  price: number;
  size: number;
  progId: number;
  servCodeId: string;
  status: string;
  season: number;
  techNote: string;
  production: Production | null;
};

export type ServiceDocProps = CreatedUpdated & {
  servId: number;
};

export type ServiceDoc = ServiceCore & ServiceDocProps;

export type ServiceProps = {
  program?: Program;
};

export type Service = ServiceDoc & ServiceProps;

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

export async function extendServices(
  remapped: ServiceCore[],
): Promise<ServiceDoc[]> {
  //MOCKED
  //code the actual mongo lookup here.
  const withMongo: ServiceDoc[] = remapped.map((serv) => ({
    ...serv,
    createdAt: "",
    updatedAt: "",
  }));
  return withMongo;
}

// --- SELECTORS ---

// 1. Define the slice of state this entity cares about
export type ServiceSliceState = {
  serviceDocs: ServiceDoc[];
};
