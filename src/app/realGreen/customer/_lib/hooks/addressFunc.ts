import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export function getBillingAddressBlock(customer: Customer): string {
  const cust = customer;
  const addressBlock: string[] = [];
  if (cust.useBilling) {
    if (!cust.billingAddress) {
      throw new Error("Billing address is missing");
    }
    if (cust.billingCompanyName) {
      addressBlock.push(cust.billingCompanyName);
    }
    const billingNameArray: string[] = [];
    if (cust.billingTitle) billingNameArray.push(cust.billingTitle);
    if (cust.billingFirstName) billingNameArray.push(cust.billingFirstName);
    if (cust.billingLastName) billingNameArray.push(cust.billingLastName);
    if (billingNameArray.length > 0) {
      addressBlock.push(billingNameArray.join(" "));
    }
    addressBlock.push(cust.billingAddress.formattedAddress);
    return addressBlock.join("\n");
  } else {
    addressBlock.push(cust.displayName);
    addressBlock.push(cust.address.formattedAddress);
  }

  return addressBlock.join("\n");
}
