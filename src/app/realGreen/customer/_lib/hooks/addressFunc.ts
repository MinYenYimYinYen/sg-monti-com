import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { Address } from "@/app/realGreen/_lib/subTypes/Address";

// Pure address block builders for mail. No React, no store.
//
// RealGreen's `formattedAddress` is already "street\r\n city, ST zip+4": CRLF line breaks and
// a leading space on the city line. The structured fields are unreliable (the street can be
// in addressLine1 or addressLine2) and `zip` is only five digits, so the formatted text is the
// source and the structured fields are only a fallback.

/** The fields the block builders read. `Omit<Customer, "x">` satisfies it, so `CustomerUtils` can call them. */
type AddressBlockCustomer = Pick<
  Customer,
  | "displayName"
  | "useBilling"
  | "address"
  | "billingAddress"
  | "billingCompanyName"
  | "billingTitle"
  | "billingFirstName"
  | "billingLastName"
>;

function splitLines(text: string | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function buildCityLine(address: Address): string {
  const cityState = [address.city, address.state].filter(Boolean).join(", ");
  // formattedZip keeps the ZIP+4 that `zip` drops.
  const zip = address.formattedZip || address.zip || "";
  return `${cityState} ${zip}`.trim();
}

/** Street line(s) followed by the city line, clean of CRLF and stray spaces. Empty when there is no address. */
export function getAddressLines(address: Address | undefined): string[] {
  if (!address) return [];

  let lines = splitLines(address.formattedAddress);
  if (lines.length === 0) {
    lines = splitLines(
      [address.addressLine1, address.addressLine2, address.addressLine3].filter(Boolean).join("\n"),
    );
  }
  if (lines.length === 0) return [];

  const lastLine = lines[lines.length - 1];
  const hasCityLine = lines.length > 1 && (!address.city || lastLine.includes(address.city));
  if (hasCityLine) return lines;

  const cityLine = buildCityLine(address);
  return cityLine === "" ? lines : [...lines, cityLine];
}

/** Company line, then the contact line. A missing first or last name is skipped, not blanked. */
export function getBillingNameLines(customer: AddressBlockCustomer): string[] {
  const company = customer.billingCompanyName?.trim() ?? "";
  const person = [customer.billingTitle, customer.billingFirstName, customer.billingLastName]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part !== "")
    .join(" ");

  const nameLines = [company, person].filter((line) => line !== "");
  // Some records repeat the company as the contact name.
  if (nameLines.length === 2 && nameLines[0].toLowerCase() === nameLines[1].toLowerCase()) {
    return [nameLines[0]];
  }
  return nameLines;
}

export function getServiceAddressBlock(customer: AddressBlockCustomer): string {
  return [customer.displayName, ...getAddressLines(customer.address)].join("\n");
}

/**
 * Falls back to the service block when the customer does not bill separately or has no usable
 * billing address. It never throws: one bad record must not abort a whole batch of letters.
 */
export function getBillingAddressBlock(customer: AddressBlockCustomer): string {
  if (!customer.useBilling) return getServiceAddressBlock(customer);

  const billingAddressLines = getAddressLines(customer.billingAddress);
  if (billingAddressLines.length === 0) return getServiceAddressBlock(customer);

  const nameLines = getBillingNameLines(customer);
  const heading = nameLines.length > 0 ? nameLines : [customer.displayName];
  return [...heading, ...billingAddressLines].join("\n");
}
