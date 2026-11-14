import { describe, it, expect } from "vitest";
import { makeCustomer } from "@/_builders/makeCustomer";
import { makePrepayConfig } from "@/_builders/makePrepayConfig";
import { makePriceTable } from "@/_builders/makePriceTable";
import { makeProgCode } from "@/_builders/makeProgCode";
import {
  makeLetterCustomer,
  makeUpsellProgCode,
} from "@/__tests__/prepayLetters/prepayTestHelpers";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/pricing/installmentSegregation";
import { getUpsellLetterPricing } from "@/app/prepayLetters/pricing/upsellPricing";
import { getStubTotals } from "@/app/prepayLetters/pricing/stubTotals";
import { buildIntentionLines } from "@/app/prepayLetters/pricing/intentionLines";

// Balances are covered in balanceAdjustment.test.ts; these tests are about prepay math.
const config = makePrepayConfig({
  stdPrepayDiscPercent: 5,
  upsellPrepayDiscPercent: 10,
  showCreditBalance: false,
  showRemitBalance: false,
});

const customer = makeLetterCustomer();
const upsell = makeUpsellProgCode();

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const currentTotals = calculatePrepayTotals({
  programs: getPrepayPrograms(customer),
  prepayPercent: config.stdPrepayDiscPercent,
});
const combinedTotals = getUpsellLetterPricing({
  customer,
  upsell,
  prepayPercent: config.upsellPrepayDiscPercent,
})!.combinedTotals;

describe("getStubTotals", () => {
  it("current: current services at the standard prepay percent", () => {
    expect(
      getStubTotals({ customer, config, upsell, totalsSource: "current" }),
    ).toEqual(currentTotals);
  });

  it("upsell: current plus upsell at the upsell prepay percent", () => {
    expect(
      getStubTotals({ customer, config, upsell, totalsSource: "upsell" }),
    ).toEqual(combinedTotals);
  });

  it("upsell falls back to current when there is no upsell", () => {
    expect(
      getStubTotals({ customer, config, upsell: null, totalsSource: "upsell" }),
    ).toEqual(currentTotals);
  });

  it("upsell falls back to current when the upsell cannot be priced", () => {
    // Built through makeProgCode: ProgCode.x is bound to the data it was built
    // with, so spreading a new priceTable onto a copy would not change its pricing.
    const unpriceable = makeProgCode({
      progCode: {
        description: "Empty Chart",
        priceTable: makePriceTable({ ranges: [] }),
      },
      servCodes: [{ name: "Visit" }],
    });
    expect(
      getStubTotals({
        customer,
        config,
        upsell: unpriceable,
        totalsSource: "upsell",
      }),
    ).toEqual(currentTotals);
  });
});

describe("buildIntentionLines", () => {
  it("renders all three lines with checkboxes for a customer with an upsell and no autopay", () => {
    const lines = buildIntentionLines({ customer, config, upsell });

    expect(lines.map((line) => line.key)).toEqual([
      "addUpsell",
      "prepayCurrent",
      "payAutomatically",
    ]);
    expect(lines.every((line) => line.hasCheckbox)).toBe(true);
    expect(lines[0]!.text).toContain(formatMoney(combinedTotals.prepayDisc));
    expect(lines[1]!.text).toContain(formatMoney(currentTotals.prepayDisc));
    expect(lines[2]!.text).toContain("credit card on back");
  });

  it("omits the upsell line when there is no upsell", () => {
    const lines = buildIntentionLines({ customer, config, upsell: null });

    expect(lines.map((line) => line.key)).toEqual([
      "prepayCurrent",
      "payAutomatically",
    ]);
  });

  it("replaces the automatic payment checkbox with a statement when any program is autopay", () => {
    const autopayCustomer = makeCustomer({
      programs: [
        { core: { billingType: BILLING_TYPE.RegularInvoice }, services: [] },
        { core: { billingType: BILLING_TYPE.AutoCreditCard }, services: [] },
      ],
    });

    const lines = buildIntentionLines({
      customer: autopayCustomer,
      config,
      upsell: null,
    });
    const autoLine = lines.find((line) => line.key === "payAutomatically")!;

    expect(autoLine.hasCheckbox).toBe(false);
    expect(autoLine.text).toContain("currently set up to pay automatically");
  });
});
