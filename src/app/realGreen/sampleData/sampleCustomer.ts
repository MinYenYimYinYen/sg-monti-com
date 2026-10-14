import { baseCustomerNoX } from "@/app/realGreen/customer/_lib/entities/bases/baseCustomer";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { Aging } from "@/app/realGreen/customer/_lib/classes/Aging";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { sampleBillingAddress, sampleServiceAddress } from "./sampleAddress";
import { sampleProgram1, sampleProgram2, sampleProgram3 } from "./samplePrograms";

const sampleCustomerNoX: Omit<Customer, "x"> = {
  ...baseCustomerNoX,
  custId: 10001,
  displayName: "John Doe",
  firstName: "John",
  lastName: "Doe",
  useBilling: true,
  billingAddress: sampleBillingAddress,
  address: sampleServiceAddress,
  programs: [sampleProgram1, sampleProgram2, sampleProgram3],
};

export const sampleCustomer: Customer = {
  ...sampleCustomerNoX,
  x: new CustomerUtils(sampleCustomerNoX),
};
