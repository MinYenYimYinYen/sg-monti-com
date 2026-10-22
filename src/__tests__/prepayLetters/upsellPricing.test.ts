import { describe, it, expect } from "vitest";
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import { sampleCustomer } from "@/app/realGreen/sampleData/sampleCustomer";
import { sampleCustomerDiscount } from "@/app/realGreen/sampleData/sampleDiscounts";
import {
  sampleUpsellPriceTable,
  sampleUpsellProgCode,
} from "@/app/realGreen/sampleData/sampleUpsellProgCode";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/installmentSegregation";
import {
  addPrepayTotals,
  getUpsellLetterPricing,
  priceUpsell,
} from "@/app/prepayLetters/upsellPricing";
import { calculatePrepayServTotal } from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import type { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";

const TAX_RATE = 7.375;
const UPSELL_PERCENT = 10;

function makeTaxCode(rate: number): TaxCode {
  return {
    taxCodeId: `TX-${rate}`,
    taxRate: rate,
    available: true,
    createdAt: "",
    updatedAt: "",
  };
}

/** A customer of size 15 with the standard tax rate, optionally with the 5% customer discount. */
function makeCustomer({ withDiscount }: { withDiscount: boolean }) {
  return generateCustomer({
    core: { size: 15 },
    taxCodes: [makeTaxCode(TAX_RATE)],
    discount: withDiscount ? sampleCustomerDiscount : null,
  });
}

/** A ProgCode with one service, built through generateCustomer, with the given price table. */
function makeProgCode({
  priceTable,
  serviceCount,
}: {
  priceTable: typeof sampleUpsellPriceTable | null;
  serviceCount: number;
}) {
  return generateCustomer({
    programs: [
      {
        progCode: { description: "Test Program", priceTable },
        services: Array.from({ length: serviceCount }, () => ({
          servCode: { name: "Visit" },
        })),
      },
    ],
  }).programs[0]!.progCode;
}

describe("priceUpsell", () => {
  it("applies the customer discount at runtime: 150 -> 142.50 -> prepay 14.25 -> tax 9.46 -> 137.71", () => {
    const customer = makeCustomer({ withDiscount: true });

    const priced = priceUpsell({
      progCode: sampleUpsellProgCode,
      customer,
      prepayPercent: UPSELL_PERCENT,
    });

    expect(priced).not.toBeNull();
    expect(priced!.description).toBe("Some Upsell Program");
    expect(priced!.services.map((s) => s.name)).toEqual([
      "Some Upsell 1",
      "Some Upsell 2",
    ]);
    for (const service of priced!.services) {
      expect(service.price).toBe(150);
      expect(service.priceAfterDiscounts).toBe(142.5);
      expect(service.hasDiscount).toBe(true);
    }
    expect(priced!.totals.serviceAmt).toBeCloseTo(285, 2);
    expect(priced!.totals.prepayDisc).toBeCloseTo(28.5, 2);
    expect(priced!.totals.afterPrepay).toBeCloseTo(256.5, 2);
    expect(priced!.totals.tax).toBeCloseTo(18.92, 2);
    expect(priced!.totals.total).toBeCloseTo(275.42, 2);
  });

  it("matches calculatePrepayServTotal for every service (single source of truth)", () => {
    const customer = makeCustomer({ withDiscount: true });

    const priced = priceUpsell({
      progCode: sampleUpsellProgCode,
      customer,
      prepayPercent: UPSELL_PERCENT,
    })!;

    const perService = calculatePrepayServTotal({
      price: 150,
      discounts: [sampleCustomerDiscount],
      prepayPercent: UPSELL_PERCENT,
      taxRate: TAX_RATE,
    });
    expect(priced.totals.total).toBeCloseTo(perService * 2, 2);
  });

  it("applies no discount and no asterisk when the customer has no discount", () => {
    const customer = makeCustomer({ withDiscount: false });

    const priced = priceUpsell({
      progCode: sampleUpsellProgCode,
      customer,
      prepayPercent: 0,
    })!;

    for (const service of priced.services) {
      expect(service.priceAfterDiscounts).toBe(150);
      expect(service.hasDiscount).toBe(false);
    }
    expect(priced.totals.serviceAmt).toBeCloseTo(300, 2);
    expect(priced.totals.prepayDisc).toBe(0);
  });

  it("returns null when the program has no price table", () => {
    const progCode = makeProgCode({ priceTable: null, serviceCount: 1 });

    expect(
      priceUpsell({
        progCode,
        customer: makeCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("returns null when the price table has no ranges", () => {
    const progCode = makeProgCode({
      priceTable: { ...sampleUpsellPriceTable, ranges: [] },
      serviceCount: 1,
    });

    expect(
      priceUpsell({
        progCode,
        customer: makeCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("returns null when the program has no services", () => {
    const progCode = makeProgCode({
      priceTable: sampleUpsellPriceTable,
      serviceCount: 0,
    });

    expect(
      priceUpsell({
        progCode,
        customer: makeCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("returns null for an installment program (never priced on the letter)", () => {
    expect(
      priceUpsell({
        progCode: { ...sampleUpsellProgCode, isInstallment: true },
        customer: makeCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });
});

describe("getUpsellLetterPricing", () => {
  it("returns null when there is no upsell, so no upsell slot renders", () => {
    expect(
      getUpsellLetterPricing({
        customer: sampleCustomer,
        upsell: null,
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("applies the upsell percent to every current and proposed service", () => {
    const pricing = getUpsellLetterPricing({
      customer: sampleCustomer,
      upsell: sampleUpsellProgCode,
      prepayPercent: UPSELL_PERCENT,
    })!;

    const currentAtUpsellPercent = calculatePrepayTotals({
      programs: getPrepayPrograms(sampleCustomer),
      prepayPercent: UPSELL_PERCENT,
    });

    expect(pricing.currentTotals).toEqual(currentAtUpsellPercent);
    expect(pricing.combinedTotals).toEqual(
      addPrepayTotals({
        first: currentAtUpsellPercent,
        second: pricing.upsell.totals,
      }),
    );
    expect(pricing.combinedTotals.serviceAmt).toBeCloseTo(
      currentAtUpsellPercent.serviceAmt + 285,
      2,
    );
  });

  it("prices the sample upsell for the sample customer (size 15, 5% discount)", () => {
    const pricing = getUpsellLetterPricing({
      customer: sampleCustomer,
      upsell: sampleUpsellProgCode,
      prepayPercent: UPSELL_PERCENT,
    })!;

    expect(pricing.upsell.services).toHaveLength(2);
    expect(pricing.upsell.services[0]!.priceAfterDiscounts).toBe(142.5);
  });
});
