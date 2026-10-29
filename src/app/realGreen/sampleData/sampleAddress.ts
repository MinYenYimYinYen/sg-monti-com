import { baseAddress } from "@/app/realGreen/_lib/subTypes/Address";
import type { Address } from "@/app/realGreen/_lib/subTypes/Address";

export const sampleBillingAddress: Address = {
  ...baseAddress,
  addressLine1: "123 Sesame St",
  city: "Springfield",
  state: "MN",
  zip: "55001",
  // Same shape RealGreen returns: CRLF, and a leading space on the city line.
  formattedAddress: "123 Sesame St\r\n Springfield, MN 55001-1234",
  formattedZip: "55001-1234",
  houseNumber: "123",
  streetName: "Sesame",
  streetSuffix: "St",
};

export const sampleServiceAddress: Address = {
  ...baseAddress,
  addressLine1: "456 Oak Ave",
  city: "Springfield",
  state: "MN",
  zip: "55001",
  formattedAddress: "456 Oak Ave\r\n Springfield, MN 55001-5678",
  formattedZip: "55001-5678",
  houseNumber: "456",
  streetName: "Oak",
  streetSuffix: "Ave",
};
