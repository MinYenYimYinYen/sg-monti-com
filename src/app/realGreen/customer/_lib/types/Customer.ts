import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";
import { Address } from "@/app/realGreen/_lib/subTypes/Address";
import { typeGuard } from "@/lib/typeGuard";
import {
  baseContactPreference,
  ContactPreference,
  ContactPreferenceRaw,
  remapContactPreference,
} from "@/app/realGreen/_lib/subTypes/ContactPreferences";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { Phone } from "@/app/realGreen/_lib/subTypes/Phone";

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
  phones: Phone[];
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
  phones: Phone[];
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
  // progams: Program[]
}

export type CustomerHydrated = CustomerDoc & CustomerProps;

function remapCustomer(raw: CustomerRaw): CustomerCore {
  return {
    custId: raw.id,
    address: raw.address,
    billingAddress: raw.billingAddress,
    billingCompanyName: raw.billingCompanyName,
    billingFirstName: raw.billingFirstName,
    billingLastName: raw.billingLastName,
    billingTitle: raw.billingTitle,
    billingType: raw.billingType,
    callAheadId: raw.callCode,
    censusTractInfo: raw.censusTractInfo,
    contactPreference:
      remapContactPreference(raw.contactPreferences) || baseContactPreference,
    directions: raw.directions,
    discountId: raw.discountCode,
    displayName: raw.displayName,
    email: raw.email,
    importDate: raw.importDate || "",
    isMasterAcct: raw.isMasterAccount,
    masterAcctId: raw.masterAccountID || baseNumId,
    netBalance: raw.netBalance,
    phones: raw.phones,
    size: raw.size,
    status: raw.statusCharacter,
    subdivisionId: raw.subdivisionID || baseNumId,
    taxIds: typeGuard.definedArray([raw.taxID1, raw.taxID2, raw.taxID3]),
    techNote: raw.techNote,
    useBilling: raw.useBillingInfo,
  };
}

export function remapCustomers(raw: CustomerRaw[]) {
  return raw.map((r) => remapCustomer(r));
}

// export function extendCustomer({
//   remapped,
//   mongo,
// }: {
//   remapped: CustomerCore;
//   mongo?: CustomerDoc;
// }): Customer {
//   return {
//     ...remapped,
//     createdAt: mongo?.createdAt || "",
//     updatedAt: mongo?.updatedAt || "",
//   };
// }

export async function extendCustomers(
  remapped: CustomerCore[],
): Promise<CustomerDoc[]> {
  //MOCKED for now
  const withMongo = remapped.map((cust) => ({
    ...cust,
    createdAt: "",
    updatedAt: "",
  }));
  return withMongo;
}

// export function extendCustomers({
//   remapped,
//   mongo,
// }: {
//   remapped: CustomerCore[];
//   mongo: CustomerDoc[];
// }): Customer[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.custId);
//
//   return remapped.map((r) =>
//     extendCustomer({
//       remapped: r,
//       mongo: mongoMap.get(r.custId),
//     }),
//   );
// }
