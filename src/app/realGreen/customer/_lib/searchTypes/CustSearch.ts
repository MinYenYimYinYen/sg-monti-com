import {
  CustStat,
  RGNumRange,
  RGStringRange,
  statusArrayToStringRange,
} from "@/app/realGreen/_lib/subTypes/RGSearchRanges";
import { TRange } from "@/lib/primatives/TRange";
import {RGSearchBase} from "@/app/realGreen/customer/_lib/searchTypes/RGSearchBase";

export type CustomerSearchRG = RGSearchBase & {
  // billingCity?: string;
  // billingCompanyName?: string;
  // billingEmail?: string;
  // billingFirstName?: string;
  // billingLastName?: string;
  // billingPostDirection?: string;
  // billingPreDirection?: string;
  // billingState?: string;
  // billingStreetAddress?: string;
  // billingStreetName?: string;
  // billingStreetNumber?: string;
  // billingStreetSuffix?: string;
  // billingType?: string;
  // billingZip?: string;
  // carrierRoute?: string;
  // created?: DateTimeRange;
  // customerBranchID?: IntRange;
  // customerCallCode?: number;
  // customerCancelBy?: string;
  // customerCancelCode?: number;
  // customerCancelDate?: DateTimeRange;
  // customerCensusTractInfo?: string;
  // customerCity?: string;
  // customerCollectionCodeId?: number;
  // customerCollectionDate?: DateTimeRange;
  // customerCollectionExportDate?: DateTimeRange;
  // customerCompanyName?: string;
  // customerCreditLimit?: DecimalRange;
  // customerDirections?: string;
  // customerEmail?: string;
  // customerEstimatedHouseCost?: DecimalRange;
  // customerFirstName?: string;
  // customerHoldBegin?: DateTimeRange;
  // customerHoldCode?: number;
  // customerHoldEnd?: DateTimeRange;
  customerID?: number[];
  // customerInvoiceType?: DecimalRange;
  // customerIsBilledWithMasterAccount?: boolean;
  // customerIsMasterAccount?: boolean;
  // customerLastName?: string;
  // customerLatitude?: DecimalRange;
  // customerLongitude?: DecimalRange;
  // customerMapCode?: StringRange;
  // customerMasterAccountID?: number;
  // customerMemo?: string;
  // customerMemoAlert?: boolean;
  // customerNoCreditHold?: boolean;
  // customerNoInterest?: boolean;
  // customerPassword?: string;
  // customerPh?: DecimalRange;
  // customerPhoneCell?: string;
  // customerPhoneFax?: string;
  // customerPhoneHome?: string;
  // customerPhoneOthr?: string;
  // customerPhonePage?: string;
  // customerPhoneWork?: string;
  // customerPostDirection?: string;
  // customerPreDirection?: string;
  // customerPropertyDimensions?: string;
  // customerReferenceID?: string;
  // customerRoute?: string;
  customerSize?: RGNumRange;
  // customerSizeSource?: string;
  // customerSource?: number;
  // customerState?: string;
  // customerStatementType?: DecimalRange;
  customerStatus?: RGStringRange;
  // customerStreetAddress?: string;
  // customerStreetName?: string;
  // customerStreetNumber?: string;
  // customerStreetSuffix?: string;
  // customerSubdivisionID?: number;
  // customerTaxId1?: string;
  // customerTaxId2?: string;
  // customerTaxId3?: string;
  // customerTechNote?: string;
  // customerTerritoryCode?: StringRange;
  // customerTrackingID?: string;
  // customerUnitCode?: number;
  // customerUserID?: string;
  // customerYearBuilt?: IntRange;
  customerZip?: string;
  // discountCode?: string;
  // offset?: number;
  // records?: number;
  // residentialCommercial?: string;
  // updated?: DateTimeRange;
  // useBillingInfo?: boolean;
};

export type CustSearch = {
  custIds?: number[];
  size?: TRange<number>;
  statuses?: CustStat[];
  zip?: string;
};

export function remapCustSearch(search: CustSearch): CustomerSearchRG {
  const rgSearch: CustomerSearchRG = {};
  if (search.custIds) rgSearch.customerID = search.custIds;
  if (search.zip) rgSearch.customerZip = search.zip;
  if (search.statuses)
    rgSearch.customerStatus = statusArrayToStringRange(search.statuses);
  if (search.size) rgSearch.customerSize = {
    minValue: search.size.min,
    maxValue: search.size.max,
  }
  return rgSearch;
}
