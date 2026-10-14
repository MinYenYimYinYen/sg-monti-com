import { baseAddress } from "@/app/realGreen/_lib/subTypes/Address";
import type { Address } from "@/app/realGreen/_lib/subTypes/Address";

export const sampleBillingAddress: Address = {
  ...baseAddress,
  addressLine1: "123 Sesame St",
  city: "Springfield",
  state: "MN",
  zip: "55001",
  formattedAddress: "123 Sesame St",
  formattedZip: "55001",
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
  formattedAddress: "456 Oak Ave",
  formattedZip: "55001",
  houseNumber: "456",
  streetName: "Oak",
  streetSuffix: "Ave",
};
