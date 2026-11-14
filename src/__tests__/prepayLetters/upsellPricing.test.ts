import { describe, it, expect } from "vitest";
import { makeCustomer } from "@/_builders/makeCustomer";
import { makeDiscount } from "@/_builders/makeDiscount";
import { makePriceTable } from "@/_builders/makePriceTable";
import { makeProgCode } from "@/_builders/makeProgCode";
import { makeTaxCode } from "@/_builders/makeTaxCode";
import {
  makeLetterCustomer,
  makeUpsellProgCode,
} from "@/__tests__/prepayLetters/prepayTestHelpers";
import { DiscountType } from "@/app/realGreen/discount/DiscountTypes";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/pricing/installmentSegregation";
import {
  addPrepayTotals,
  getUpsellLetterPricing,
  priceUpsell,
} from "@/app/prepayLetters/pricing/upsellPricing";
import { calculatePrepayServTotal } from "@/app/realGreen/priceTable/_lib/pricingFuncs";

const TAX_RATE = 7.375;
const UPSELL_PERCENT = 10;
const UPSELL_PRICE = 150;

const customerDiscount = makeDiscount({
  discountType: DiscountType.PERCENT,
  isPermanent: true,
  amount: 5,
});

// Two services at 150 each.
const upsell = makeUpsellProgCode({
  description: "Some Upsell Program",
  price: UPSELL_PRICE,
  serviceLongNames: ["Some Upsell - First Visit", "Some Upsell - Second Visit"],
});

/** A customer of size 15 with the standard tax rate, optionally with a 5% customer discount. */
function makeSizedCustomer({ withDiscount }: { withDiscount: boolean }) {
  return makeCustomer({
    core: { size: 15 },
    taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
    discount: withDiscount ? customerDiscount : null,
  });
}

describe("priceUpsell", () => {
  it("applies the customer discount at runtime: 150 -> 142.50 -> prepay 14.25 -> tax 9.46 -> 137.71", () => {
    const customer = makeSizedCustomer({ withDiscount: true });

    const priced = priceUpsell({
      progCode: upsell,
      customer,
      prepayPercent: UPSELL_PERCENT,
    });

    expect(priced).not.toBeNull();
    expect(priced!.description).toBe("Some Upsell Program");
    expect(priced!.services.map((s) => s.longName)).toEqual([
      "Some Upsell - First Visit",
      "Some Upsell - Second Visit",
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
    const customer = makeSizedCustomer({ withDiscount: true });

    const priced = priceUpsell({
      progCode: upsell,
      customer,
      prepayPercent: UPSELL_PERCENT,
    })!;

    const perService = calculatePrepayServTotal({
      price: UPSELL_PRICE,
      discounts: [customerDiscount],
      prepayPercent: UPSELL_PERCENT,
      taxRates: [TAX_RATE],
    });
    expect(priced.totals.total).toBeCloseTo(perService * 2, 2);
  });

  it("applies no discount and no asterisk when the customer has no discount", () => {
    const customer = makeSizedCustomer({ withDiscount: false });

    const priced = priceUpsell({
      progCode: upsell,
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
    const progCode = makeProgCode({
      progCode: { priceTable: null },
      servCodes: [{ name: "Visit" }],
    });

    expect(
      priceUpsell({
        progCode,
        customer: makeSizedCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("returns null when the price table has no ranges", () => {
    const progCode = makeProgCode({
      progCode: { priceTable: makePriceTable({ ranges: [] }) },
      servCodes: [{ name: "Visit" }],
    });

    expect(
      priceUpsell({
        progCode,
        customer: makeSizedCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("returns null when the program has no services", () => {
    const progCode = makeUpsellProgCode({ serviceLongNames: [] });

    expect(
      priceUpsell({
        progCode,
        customer: makeSizedCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("returns null for an installment program (never priced on the letter)", () => {
    expect(
      priceUpsell({
        progCode: { ...upsell, isInstallment: true },
        customer: makeSizedCustomer({ withDiscount: true }),
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });
});

describe("getUpsellLetterPricing", () => {
  const customer = makeLetterCustomer();

  it("returns null when there is no upsell, so no upsell slot renders", () => {
    expect(
      getUpsellLetterPricing({
        customer,
        upsell: null,
        prepayPercent: UPSELL_PERCENT,
      }),
    ).toBeNull();
  });

  it("applies the upsell percent to every current and proposed service", () => {
    const pricing = getUpsellLetterPricing({
      customer,
      upsell,
      prepayPercent: UPSELL_PERCENT,
    })!;

    const currentAtUpsellPercent = calculatePrepayTotals({
      programs: getPrepayPrograms(customer),
      prepayPercent: UPSELL_PERCENT,
    });

    expect(pricing.currentTotals).toEqual(currentAtUpsellPercent);
    expect(pricing.combinedTotals).toEqual(
      addPrepayTotals({
        first: currentAtUpsellPercent,
        second: pricing.upsell.totals,
      }),
    );
    // Two upsell services at 150, less the customer's 5% discount.
    expect(pricing.combinedTotals.serviceAmt).toBeCloseTo(
      currentAtUpsellPercent.serviceAmt + 285,
      2,
    );
  });

  it("prices the upsell with the customer's size and discount", () => {
    const pricing = getUpsellLetterPricing({
      customer,
      upsell,
      prepayPercent: UPSELL_PERCENT,
    })!;

    expect(pricing.upsell.services).toHaveLength(2);
    expect(pricing.upsell.services[0]!.priceAfterDiscounts).toBe(142.5);
  });
});