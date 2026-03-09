import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Address } from "@/app/realGreen/_lib/subTypes/Address";
import {
  ContactPreference,
  ContactPreferenceRaw,
} from "@/app/realGreen/_lib/subTypes/ContactPreferences";
import { ContactPoint, PhoneRaw } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { Program } from "./ProgramTypes";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";
import { Flag } from "@/app/realGreen/flag/FlagTypes";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";

export type CustomerRaw = {
  address: Address;
  // appliedBalance: number | null;
  billingAddress: Address;
  billingCompanyName: string;
  // billingEmail: string;
  billingFirstName: string;
  billingLastName: string;
  billingTitle: string;
  // billingTitleCode: number;
  billingType: string;
  // billingTypeEnum: number;
  // branchID: number;
  // branchNumber: string;
  callCode: number;
  // callingMethodKeyProperty: number | null;
  // cancelCode: number | null;
  // cancelDate: string | null;
  // cancelReason: string | null;
  // canceledBy: string;
  // cardExpiryDate: string | null;
  // cardType: string;
  // carrierRoute: string;
  censusTractInfo: string;
  // collectionCodeId: number | null;
  // collectionDate: string | null;
  // collectionExportDate: string | null;
  // companyName: string;
  contactPreferences: ContactPreferenceRaw | null;
  // countyID: string;
  // creditHoldStatus: number;
  // creditLimit: number;
  // customerContAllow: string;
  // customerWebsiteUrl: string;
  directions: string;
  discountCode: string;
  displayName: string;
  // doNotChargeInterest: boolean;
  // doNotPutOnCreditHold: boolean;
  // due1: number;
  // due2: number;
  // due3: number;
  // due4: number;
  // due5: number;
  // due6: number;
  // due7: number;
  email: string;
  // estimateBy: string | null;
  // estimateGivenDate: string | null;
  // estimatedHouseCost: number | null;
  // firstName: string;
  // holdBegin: string | null;
  // holdCode: number | null;
  // holdEnd: string | null;
  id: number;
  importDate: string | null;
  // invoiceType: number;
  // isBilledWithMasterAccount: boolean;
  // isCanceled: boolean;
  isMasterAccount: boolean;
  // lastFourNumber: string;
  // lastName: string;
  // lastPaymentAmount: number | null;
  // lastPaymentDate: string | null;
  // /**
  //  * @deprecated Use address.latitude
  //  */
  // latitude: string | null;
  // /**
  //  * @deprecated Use address.longitude
  //  */
  // longitude: string | null;
  // mapCode: string;
  // masterAccountBranches: number[];
  masterAccountID: number | null;
  // memo: string;
  // memoAlert: boolean;
  // nameFirstLast: string;
  // nameLastCommaFirst: string;
  netBalance: number;
  // pH: number | null;
  // password: string;
  // payAlert: boolean;
  phones: PhoneRaw[];
  // preferredEmail: string;
  // preferredLanguage: string;
  // preferredPhone: PreferredPhoneType;
  // prepayBalance: number;
  // propertyDimensions: string;
  // propertyItemsToAdd: CustomerProperty[] | null;
  // propertyItemsToDelete: number[] | null;
  // propertyItemsToUpdate: CustomerProperty[] | null;
  // referenceID: string;
  // remitBalance: number;
  // residentalOrCommercialType: string;
  // routeCode: string;
  // since: string;
  size: number;
  // sizeSource: string;
  // sizeUnitOfMeasureID: number;
  // sourceCD: number;
  // statementFrequency: number;
  // statementType: number;
  statusCharacter: string;
  subdivisionID: number | null;
  taxID1: string;
  taxID2: string;
  taxID3: string;
  // taxRate1: number | null;
  // taxRate2: number | null;
  // taxRate3: number | null;
  techNote: string;
  // territoryCode: string;
  // title: string;
  // titleCode: number;
  // trackingID: string;
  useBillingInfo: boolean;
  // userID: string;
  // yearBuilt: number | null;
};

export type CustomerCore = {
  custId: number;
  address: Address;
  billingAddress: Address;
  billingCompanyName: string;
  billingFirstName: string;
  billingLastName: string;
  billingTitle: string;
  billingType: string;
  callAheadId: number;
  censusTractInfo: string;
  contactPreference: ContactPreference;
  directions: string;
  discountId: string;
  displayName: string;
  email: string;
  importDate: string;
  isMasterAcct: boolean;
  masterAcctId: number;
  netBalance: number;
  // phones: PhoneRaw[];
  contactPoints: ContactPoint[];
  size: number;
  status: string;
  subdivisionId: number;
  taxIds: string[];
  techNote: string;
  useBilling: boolean;
};

export type CustomerDocProps = CreatedUpdated & {
  custId: number;
};

export type CustomerDoc = CustomerCore & CustomerDocProps;

export type CustomerProps = {
  x: CustomerUtils;
  programs: Program[];
  taxCodes: TaxCode[];
  callAhead: CallAhead | null;
  discount: DiscountDoc | null;
  flags: Flag[];
};

export type Customer = CustomerDoc & CustomerProps;
