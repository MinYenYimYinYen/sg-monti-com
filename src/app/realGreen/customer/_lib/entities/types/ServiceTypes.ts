import { AppProductRaw } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { ServiceHistoryRaw } from "@/app/realGreen/_lib/subTypes/ServiceHistory";
import { DoneByRaw } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import {
  Production,
  ProductionCore,
} from "@/app/realGreen/_lib/subTypes/Production";
import { Program } from "./ProgramTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { SchedPromise } from "@/app/schedPromise/SchedPromiseTypes";
import { LoadoutBase } from "@/app/loadout/LoadoutTypes";
import { AssignmentUtils } from "@/app/assignment/AssignmentUtils";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { TaxSlot } from "@/app/realGreen/taxCode/taxSlot";

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
  nextPrice: number | null;
  nextSize: number | null;
  // postedDate?: string;
  /** Prepay discount in dollars; null or absent when the service has no prepay. Confirmed against the CRM 2026-11-18. */
  prepayAmount?: number | null;
  // prepayId?: number | null; // Not a key into the PrepayCodes list (those ids are strings like "P3"), and prepayAmount makes it unnecessary.
  // prepaymentDiscountAmount?: number; // Dead field: always 0 from RealGreen as of 2026-11-18, even when a prepay applies. Use prepayAmount.

  price: number | null;
  // productionValue?: number;
  productsUsed?: AppProductRaw[];
  // programCodeAndDescription?: string;
  programDiscountAmount: number;
  // programDiscountCodeId?: string;
  programID: number;
  round?: number;
  // scheduledTime?: number;
  serviceCode?: string;
  serviceHistory?: ServiceHistoryRaw;
  // serviceHistoryBillType?: string;
  serviceStatus: string;
  serviceYear: number;
  size: number | null;
  // soldBy1?: string;
  // soldBy2?: string;
  // soldDate?: string;
  // startAfter?: TimeSpan;
  // startDate?: string;
  // Tax the CRM recorded for the service, one slot per tax code. Source of truth for history.
  taxAmount1?: number | null;
  taxAmount2?: number | null;
  taxAmount3?: number | null;
  taxableAmount1?: number | null;
  taxableAmount2?: number | null;
  taxableAmount3?: number | null;
  technicianNote: string;
  // technicianNoteExpiration?: string;
  // timestamp?: number;
  // totalAmount?: number;
  // varianceManHoursFormatted?: string;
};

/** One tax slot as the CRM recorded it on a service. Slot n belongs to the customer's slot n. */
export type ServiceTaxLineCore = {
  slot: TaxSlot;
  taxableAmt: number;
  taxAmt: number;
};

export type ServiceTaxLineProps = {
  /** The customer's tax code in this line's slot; `baseTaxCode` when it cannot be resolved. */
  taxCode: TaxCode;
};

export type ServiceTaxLine = ServiceTaxLineCore & ServiceTaxLineProps;

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
  /**
   * Prepay discount in dollars, applied after service and program discounts. Null means the
   * service has no prepay. From RealGreen `prepayAmount`; `prepaymentDiscountAmount` is a dead field.
   */
  prepayDiscAmt: number | null;
  // prepayId: number | null; // Unused: see ServiceRaw.
  /**
   * The tax the CRM recorded for a completed service, one line per tax slot. Authoritative for
   * history; pricing functions are for proposals. Read `ServiceProps.taxLines`, which adds the code.
   */
  taxLineCores: ServiceTaxLineCore[];
  size: number;
  progId: number;
  servCodeId: string;
  status: string;
  season: number;
  techNote: string;
  productionCore: ProductionCore | null;
  round: number | null;
};

export type ServiceDoc = ServiceCore;

export type ServiceProps = {
  x: ServiceUtils;
  program: Program;
  servCode: ServCode;
  callAhead: CallAhead | null;
  discount: DiscountDoc | null;
  production: Production | null;
  /** Assignment history for this service. Use AssignmentUtils methods to access canonical data. */
  assignments: AssignmentUtils;
  promise: SchedPromise | null;
  promiseIssues: string[];
  loadoutInventory: LoadoutBase;
  eta: string | null;
  priorityService: PriorityServiceDoc | null;
  /** `taxLineCores` with each line's tax code attached. */
  taxLines: ServiceTaxLine[];
};

export type Service = ServiceDoc & ServiceProps;
