import {RGSearchBase} from "@/app/realGreen/customer/_lib/searchTypes/RGSearchBase";
import {RGStringRange} from "@/app/realGreen/_lib/subTypes/RGSearchRanges";

export type ServiceSearchRG = RGSearchBase & {
  // asapDate?: DateTimeRange;
  // associationCode?: string;
  // callAhead?: number[];
  // called?: DateTimeRange;
  // // created?: DateTimeRange;
  // customerNote?: string;
  // customerNoteExpiration?: DateTimeRange;
  customerNumber?: number[];
  // discountAmount?: DecimalRange;
  // discountCode?: string;
  // endBefore?: IntRange;
  // estimatedManHour?: IntRange;
  // extraDescription?: string;
  id?: number[];
  // invoiceNumber?: number;
  // isDependentService?: boolean;
  // isPaid?: boolean;
  // isPromised?: boolean;
  // isReversed?: boolean;
  // manHourRate?: DecimalRange;
  // nextPrice?: DecimalRange;
  // nextSize?: DecimalRange;
  // // offset?: number;
  // posted?: DateTimeRange;
  // prepayAmount?: DecimalRange;
  // prepayId?: number;
  // price?: DecimalRange;
  // productionValue?: DecimalRange;
  // programDiscountAmount?: DecimalRange;
  programID?: number[];
  // // records?: number;
  // round?: IntRange;
  // scheduledTime?: IntRange;
  // serviceCode?: string[];
  serviceStatus?: string[];
  serviceYear?: number[];
  // size?: DecimalRange;
  // soldByOne?: string;
  // soldByTwo?: string;
  // soldDate?: DateTimeRange;
  // startAfter?: IntRange;
  startDate?: RGStringRange;
  // taxAmount1?: DecimalRange;
  // taxAmount2?: DecimalRange;
  // taxAmount3?: DecimalRange;
  // taxableAmount1?: DecimalRange;
  // taxableAmount2?: DecimalRange;
  // taxableAmount3?: DecimalRange;
  // technicianNote?: string;
  // technicianNoteExpiration?: DateTimeRange;
  // totalAmount?: DecimalRange;
  // // updated?: DateTimeRange;
}

export type ServSearch = {
  custIds?: number[];
  servIds?: number[];
  progIds?: number[];
  servStats?: string[];
  season: number;
}

export function remapServSearch(search: ServSearch): ServiceSearchRG {
  const rgSearch: ServiceSearchRG = {};
  if (search.custIds) rgSearch.customerNumber = search.custIds;
  if (search.servIds) rgSearch.id = search.servIds;
  if (search.progIds) rgSearch.programID = search.progIds;
  if (search.servStats) rgSearch.serviceStatus = search.servStats;
  rgSearch.serviceYear = [search.season];
  return rgSearch;

}