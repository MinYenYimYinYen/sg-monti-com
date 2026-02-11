import { Customer } from "../types/CustomerTypes";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { baseAddress } from "@/app/realGreen/_lib/subTypes/Address";
import { baseContactPreference } from "@/app/realGreen/_lib/subTypes/ContactPreferences";

export const baseCustomer: Customer = {
  custId: baseNumId,
  address: baseAddress,
  billingAddress: baseAddress,
  billingCompanyName: "",
  billingFirstName: "",
  billingLastName: "",
  billingTitle: "",
  billingType: "",
  callAheadId: baseNumId,
  censusTractInfo: "",
  contactPreference: baseContactPreference,
  directions: "",
  discountId: "",
  displayName: "",
  email: "",
  importDate: "",
  isMasterAcct: false,
  masterAcctId: baseNumId,
  netBalance: 0,
  phones: [],
  size: 0,
  status: "",
  subdivisionId: baseNumId,
  taxIds: [],
  taxCodes: [],
  techNote: "",
  useBilling: false,
  createdAt: "",
  updatedAt: "",
  programs: [],
  callAhead: null,
  discount: null,
};
