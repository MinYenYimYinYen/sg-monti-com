import { makeCustomer } from "@/_builders/makeCustomer";
import { MnTaxLine } from "@/app/salesTax/salesTaxTypes";
import { StateTaxRevenueGroup } from "@/app/salesTax/stateTaxRevenueGroups/StateTaxRevenueGroupTypes";

/** One real service per customer id, so `service.custId` is what the builder wired, not a guess. */
function makeServiceFor(custId: number) {
  const customer = makeCustomer({
    core: { custId },
    programs: [{ services: [{ core: {} }] }],
  });
  return customer.programs[0]!.services[0]!;
}

/**
 * A Minnesota line fed by the given customers. `netAfterAllDiscounts` is stated by the test because
 * the check compares it as given; it is not recomputed from the services.
 */
export function makeMnTaxLineFor({
  code,
  custIds,
  netAfterAllDiscounts,
}: {
  code: string;
  custIds: number[];
  netAfterAllDiscounts: number;
}): MnTaxLine {
  return {
    mnTaxType: {
      code,
      description: `Tax type ${code}`,
      fipsCode: null,
      ratePercent: 0.5,
      jurisdiction: "city",
      effectiveFrom: null,
      endedOn: null,
    },
    taxCodeIds: [],
    summary: {
      services: custIds.map(makeServiceFor),
      price: netAfterAllDiscounts,
      discountAmt: 0,
      ppyDiscAmt: 0,
      netAfterAllDiscounts,
      taxAmount: 0,
    },
  };
}

export function makeRevenueGroupOf({
  revenueGroupKey,
  mnTaxCodes,
}: {
  revenueGroupKey: string;
  mnTaxCodes: string[];
}): StateTaxRevenueGroup {
  return {
    revenueGroupKey,
    members: mnTaxCodes.map((mnTaxCode) => ({ mnTaxCode, mnTaxType: null })),
  };
}
