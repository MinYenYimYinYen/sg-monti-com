import { baseAddress } from "@/app/realGreen/_lib/subTypes/Address";
import type { Address } from "@/app/realGreen/_lib/subTypes/Address";

export function makeAddress(overrides: Partial<Address> = {}): Address {
  return { ...baseAddress, ...overrides };
}
