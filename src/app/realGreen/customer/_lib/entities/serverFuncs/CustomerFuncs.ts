import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  baseContactPreference,
  remapContactPreference,
} from "@/app/realGreen/_lib/subTypes/ContactPreferences";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { CustomerCore, CustomerDoc, CustomerRaw } from "../types/CustomerTypes";
import { ContactPoint } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { AgingParams } from "@/app/realGreen/customer/_lib/classes/Aging";

function mapContactPoints(raw: CustomerRaw): ContactPoint[] {
  const phoneContacts = raw.phones.map((phone) => ({
    point: phone.number.replace(/\D/g, "").slice(0, 10),
    type: phone.type,
  }));

  const emailContacts: ContactPoint[] = raw.email.split(";").map((email) => ({
    point: email,
    type: "Email",
  }));

  return [...phoneContacts, ...emailContacts];
}

function remapCustomer(raw: CustomerRaw): CustomerCore {
  return {
    custId: raw.id,
    address: {
      ...raw.address,
      zip: raw.address.zip?.slice(0, 5) ?? "",
    },
    billingAddress: raw.billingAddress,
    billingCompanyName: raw.billingCompanyName,
    billingEmail: raw.billingEmail,
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
    lastName: raw.lastName,
    masterAcctId: raw.masterAccountID || baseNumId,
    netBalance: raw.netBalance,
    // phones: raw.phones,
    contactPoints: mapContactPoints(raw),
    creditLimit: raw.creditLimit,
    due3: raw.due3,
    agingParams: {
      due1: raw.due1,
      due2: raw.due2,
      due3: raw.due3,
      due4: raw.due4,
      due5: raw.due5,
      due6: raw.due6,
      due7: raw.due7,
    } satisfies AgingParams,
    remitBalance: raw.remitBalance,
    size: raw.size,
    status: raw.statusCharacter,
    holdCodeId: raw.holdCode,
    holdStart: raw.holdBegin ? raw.holdBegin.split("T")[0] : null,
    holdEnd: raw.holdEnd ? raw.holdEnd.split("T")[0] : null,
    subdivisionId: raw.subdivisionID || baseNumId,
    taxIds: typeGuard
      .definedArray([raw.taxID1, raw.taxID2, raw.taxID3])
      .filter((t) => t.length > 0),
    techNote: raw.techNote,
    useBilling: raw.useBillingInfo,
    cancelCodeId: raw.cancelCode,
    cancelDate: raw.cancelDate ? raw.cancelDate.split("T")[0] : null,
    canceledBy: raw.canceledBy,
    cardExpiryDate: raw.cardExpiryDate ? raw.cardExpiryDate.split("T")[0] : null,
    cardType: raw.cardType,
    companyName: raw.companyName,
    creditHoldStatus: raw.creditHoldStatus,
    doNotChargeInterest: raw.doNotChargeInterest,
    doNotPutOnCreditHold: raw.doNotPutOnCreditHold,
    firstName: raw.firstName,
    invoiceTypeId: raw.invoiceType,
    isBilledWithMasterAcct: raw.isBilledWithMasterAccount,
    isCanceled: raw.isCanceled,
    cardLastFour: raw.lastFourNumber,
    masterAcctBranches: raw.masterAccountBranches,
    memo: raw.memo,
    memoAlert: raw.memoAlert,
    memoPayAlert: raw.payAlert,
    prepayBalance: raw.prepayBalance,
    since: raw.since ? raw.since.split("T")[0] : "",
    sizeSourceId: raw.sizeSource,
    sizeUnitOfMeasureId: raw.sizeUnitOfMeasureID,
    sourceCodeId: raw.sourceCD,
    statementFrequency: raw.statementFrequency,
    statementTypeId: raw.statementType,
    title: raw.title,
  };
}

export function remapCustomers(raw: CustomerRaw[]) {
  return raw.map((r) => remapCustomer(r));
}
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
