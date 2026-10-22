import { describe, it, expect } from "vitest";
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import { sampleCustomer } from "@/app/realGreen/sampleData/sampleCustomer";
import { samplePrepayConfig } from "@/app/realGreen/sampleData/samplePrepayConfig";
import {
  sampleUpsellPriceTable,
  sampleUpsellProgCode,
} from "@/app/realGreen/sampleData/sampleUpsellProgCode";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/installmentSegregation";
import { getUpsellLetterPricing } from "@/app/prepayLetters/upsellPricing";
import { getStubTotals } from "@/app/prepayLetters/stubTotals";
import { buildIntentionLines } from "@/app/prepayLetters/intentionLines";

const config = samplePrepayConfig;

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const currentTotals = calculatePrepayTotals({
  programs: getPrepayPrograms(sampleCustomer),
  prepayPercent: config.stdPrepayDiscPercent,
});
const combinedTotals = getUpsellLetterPricing({
  customer: sampleCustomer,
  upsell: sampleUpsellProgCode,
  prepayPercent: config.upsellPrepayDiscPercent,
})!.combinedTotals;

describe("getStubTotals", () => {
  it("current: current services at the standard prepay percent", () => {
    expect(
      getStubTotals({
        customer: sampleCustomer,
        config,
        upsell: sampleUpsellProgCode,
        totalsSource: "current",
      }),
    ).toEqual(currentTotals);
  });

  it("upsell: current plus upsell at the upsell prepay percent", () => {
    expect(
      getStubTotals({
        customer: sampleCustomer,
        config,
        upsell: sampleUpsellProgCode,
        totalsSource: "upsell",
      }),
    ).toEqual(combinedTotals);
  });

  it("upsell falls back to current when there is no upsell", () => {
    expect(
      getStubTotals({
        customer: sampleCustomer,
        config,
        upsell: null,
        totalsSource: "upsell",
      }),
    ).toEqual(currentTotals);
  });

  it("upsell falls back to current when the upsell cannot be priced", () => {
    // Built through generateCustomer: ProgCode.x is bound to the data it was built
    // with, so spreading a new priceTable onto a copy would not change its pricing.
    const unpriceable = generateCustomer({
      programs: [
        {
          progCode: {
            description: "Empty Chart",
            priceTable: { ...sampleUpsellPriceTable, ranges: [] },
          },
          services: [{ servCode: { name: "Visit" } }],
        },
      ],
    }).programs[0]!.progCode;
    expect(
      getStubTotals({
        customer: sampleCustomer,
        config,
        upsell: unpriceable,
        totalsSource: "upsell",
      }),
    ).toEqual(currentTotals);
  });
});

describe("buildIntentionLines", () => {
  it("renders all three lines with checkboxes for a customer with an upsell and no autopay", () => {
    const lines = buildIntentionLines({
      customer: sampleCustomer,
      config,
      upsell: sampleUpsellProgCode,
    });

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
    const lines = buildIntentionLines({
      customer: sampleCustomer,
      config,
      upsell: null,
    });

    expect(lines.map((line) => line.key)).toEqual([
      "prepayCurrent",
      "payAutomatically",
    ]);
  });

  it("replaces the automatic payment checkbox with a statement when any program is autopay", () => {
    const customer = generateCustomer({
      programs: [
        { core: { billingType: BILLING_TYPE.RegularInvoice }, services: [] },
        { core: { billingType: BILLING_TYPE.AutoCreditCard }, services: [] },
      ],
    });

    const lines = buildIntentionLines({ customer, config, upsell: null });
    const autoLine = lines.find((line) => line.key === "payAutomatically")!;

    expect(autoLine.hasCheckbox).toBe(false);
    expect(autoLine.text).toContain("currently set up to pay automatically");
  });
});
