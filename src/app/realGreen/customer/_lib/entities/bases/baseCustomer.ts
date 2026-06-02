import { Customer } from "../types/CustomerTypes";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { baseAddress } from "@/app/realGreen/_lib/subTypes/Address";
import { baseContactPreference } from "@/app/realGreen/_lib/subTypes/ContactPreferences";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { Aging, baseAgingParams } from "@/app/realGreen/customer/_lib/classes/Aging";

export const baseCustomerNoX: Omit<Customer, "x"> = {
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
  lastName: "",
  masterAcctId: baseNumId,
  netBalance: 0,
  // phones: [],
  contactPoints: [],
  creditLimit: 0,
  due3: 0,
  remitBalance: 0,
  size: 0,
  status: "",
  holdCodeId: null,
  holdStart: null,
  holdEnd: null,
  subdivisionId: baseNumId,
  taxIds: [],
  taxCodes: [],
  taxRate: 0,
  techNote: "",
  useBilling: false,
  createdAt: "",
  updatedAt: "",
  programs: [],
  callAhead: null,
  discount: null,
  flags: [],
  promise: null,
  promiseIssues: [],
  agingParams: baseAgingParams,
  aging: new Aging(baseAgingParams),
};

export const baseCustomer: Customer = {
  ...baseCustomerNoX,
  x: new CustomerUtils(baseCustomerNoX),
};