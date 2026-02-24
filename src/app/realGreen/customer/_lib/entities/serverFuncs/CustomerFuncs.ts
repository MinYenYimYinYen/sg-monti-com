import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  baseContactPreference,
  remapContactPreference,
} from "@/app/realGreen/_lib/subTypes/ContactPreferences";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { CustomerCore, CustomerDoc, CustomerRaw } from "../types/CustomerTypes";



function remapCustomer(raw: CustomerRaw): CustomerCore {
  return {
    custId: raw.id,
    address: {
      ...raw.address,
      zip: raw.address.zip?.slice(0, 5) ?? "",
    },
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
    taxIds: typeGuard
      .definedArray([raw.taxID1, raw.taxID2, raw.taxID3])
      .filter((t) => t.length > 0),
    techNote: raw.techNote,
    useBilling: raw.useBillingInfo,
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