import {
  makeCustomer,
  type ProgCodeSpec,
  type ServCodeSpec,
} from "@/_builders/makeCustomer";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

type MakeProgCodeSpec = {
  progCode?: ProgCodeSpec;
  /** One entry per service code on the program, so the array length is the service count. */
  servCodes?: ServCodeSpec[];
};

/**
 * Builds a ProgCode with its ServCodes wired like runtime data. `ProgCode.x` is bound to the
 * data it was built with, so give the price table here instead of spreading a new one onto
 * a copy, which would not change its pricing.
 */
export function makeProgCode({
  progCode = {},
  servCodes = [],
}: MakeProgCodeSpec = {}): ProgCode {
  const customer = makeCustomer({
    programs: [
      { progCode, services: servCodes.map((servCode) => ({ servCode })) },
    ],
  });
  return customer.programs[0]!.progCode;
}
