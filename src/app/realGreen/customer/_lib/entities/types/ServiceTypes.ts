import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import {
  AppProduct,
  AppProductRaw,
} from "@/app/realGreen/_lib/subTypes/AppProduct";
import { ServiceHistoryRaw } from "@/app/realGreen/_lib/subTypes/ServiceHistory";
import { DoneByRaw } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import {
  Production,
  ProductionCore,
} from "@/app/realGreen/_lib/subTypes/Production";
import { Program } from "./ProgramTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CallAheadDoc } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";

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
  productsUsed?: AppProductRaw[];
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
  callAheadId: number;
  custId: number;
  discountId: string;
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
  productionCore: ProductionCore | null;
};

export type Assignment = {
  employeeId: string;
  date: string;
};
//todo: Left off here.  Need to add handlers for reading/writing assignments.
// Need to make a CSV importer.
// Need to make a CSV configurator for parsing assignment data from unserviced report.

export type ServiceDocProps = CreatedUpdated & {
  servId: number;
  assignments: Assignment[];
};

export type ServiceDoc = ServiceCore & ServiceDocProps;

export type ServiceUnserviced = {
  servId: number;
  status: string;
  employeeId: string;
  schedDate: string;
};

export type ServiceProps = {
  program: Program;
  servCode: ServCode;
  callAhead: CallAheadDoc | null;
  discount: DiscountDoc | null;
  production: Production | null;
  productsPlanned: AppProduct[];
  // productsUsed: AppProductRaw[];
};

export type Service = ServiceDoc & ServiceProps;