import { describe, it, expect } from "vitest";
import { makeCustomer } from "@/_builders/makeCustomer";
import { makeDiscount } from "@/_builders/makeDiscount";
import { makeTaxCode } from "@/_builders/makeTaxCode";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";
import { DiscountType } from "@/app/realGreen/discount/DiscountTypes";
import {
  buildProgramRollupLabel,
  buildServicePriceRows,
} from "@/app/prepayLetters/pricing/servicePriceRows";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/pricing/installmentSegregation";

const PREPAY_PERCENT = 5;

// 9 prepay services across 3 programs, plus an installment program that is never listed.
const SERVICE_COUNT = 9;

const customer = makeCustomer({
  core: { size: 15 },
  taxCodes: [makeTaxCode({ taxRate: 7.375 })],
  programs: [
    {
      progCode: { description: "Lawn Care Program" },
      services: [
        {
          core: { price: 100 },
          servCode: { name: "Early Spr Visit", longName: "Early Spring Visit" },
          discount: makeDiscount({ discountType: DiscountType.DOLLAR, amount: 15 }),
        },
        {
          core: { price: 100 },
          servCode: { name: "Spr Visit", longName: "Spring Visit" },
        },
        {
          core: { price: 100 },
          servCode: { name: "Sum Visit", longName: "Summer Visit" },
        },
      ],
    },
    {
      progCode: { description: "Insect Control Program" },
      discount: makeDiscount({ discountType: DiscountType.PERCENT, amount: 10 }),
      services: [
        { core: { price: 150 }, servCode: { name: "Insect 1", longName: "Insect Control" } },
        { core: { price: 150 }, servCode: { name: "Insect 2", longName: "Insect Control" } },
      ],
    },
    {
      progCode: { description: "Mosquito Reduction Program" },
      services: [
        { core: { price: 50 }, servCode: { name: "Mosq May", longName: "Mosquito Reduction - End of May" } },
        { core: { price: 50 }, servCode: { name: "Mosq Jul", longName: "Mosquito Reduction - Early July" } },
        { core: { price: 50 }, servCode: { name: "Mosq Aug", longName: "Mosquito Reduction - Early August" } },
        { core: { price: 50 }, servCode: { name: "Mosq Sep", longName: "Mosquito Reduction - Early September" } },
      ],
    },
    {
      core: { billingType: BILLING_TYPE.Installment },
      progCode: { description: "Pest Control Program" },
      services: [
        { core: { price: 240 }, servCode: { name: "Spr Pest", longName: "Spring Pest Control" } },
        { core: { price: 240 }, servCode: { name: "Fall Pest", longName: "Fall Pest Control" } },
      ],
    },
  ],
});

describe("buildServicePriceRows", () => {
  it("lists one row per service when the count equals the threshold", () => {
    const rows = buildServicePriceRows({
      customer,
      thresholdForProgramRollup: SERVICE_COUNT,
    });
    expect(rows).toHaveLength(SERVICE_COUNT);
    expect(rows[0]!.label).toBe("Early Spring Visit");
    // Prints the long name, not the short name ("Mosq May"), as on the customer's letter.
    expect(rows.map((row) => row.label)).toContain("Mosquito Reduction - End of May");
    expect(rows.map((row) => row.label)).not.toContain("Mosq May");
  });

  it("rolls up to one row per program when the count exceeds the threshold", () => {
    const rows = buildServicePriceRows({
      customer,
      thresholdForProgramRollup: SERVICE_COUNT - 1,
    });
    expect(rows.map((row) => row.label)).toEqual([
      "Lawn Care Program (3 services)",
      "Insect Control Program (2 services)",
      "Mosquito Reduction Program (4 services)",
    ]);
  });

  it("uses the singular for a one-service program", () => {
    expect(
      buildProgramRollupLabel({ description: "Lawn Care Program", serviceCount: 1 }),
    ).toBe("Lawn Care Program (1 service)");
  });

  it("rolled-up prices sum to the totals service amount", () => {
    const rows = buildServicePriceRows({
      customer,
      thresholdForProgramRollup: 1,
    });
    const { serviceAmt } = calculatePrepayTotals({
      programs: getPrepayPrograms(customer),
      prepayPercent: PREPAY_PERCENT,
    });
    const sum = rows.reduce((total, row) => total + row.price, 0);
    expect(sum).toBeCloseTo(serviceAmt, 2);
  });

  it("flags discounts and keeps the original price on rolled-up rows", () => {
    const rows = buildServicePriceRows({
      customer,
      thresholdForProgramRollup: 1,
    });
    const [lawn, , mosquito] = rows;
    expect(lawn!.hasDiscount).toBe(true);
    expect(lawn!.originalPrice).toBe(300);
    expect(lawn!.price).toBe(285);
    expect(mosquito!.hasDiscount).toBe(false);
    expect(mosquito!.originalPrice).toBe(200);
    expect(mosquito!.price).toBe(200);
  });

  it("excludes installment programs in both modes", () => {
    for (const thresholdForProgramRollup of [1, 50]) {
      const labels = buildServicePriceRows({
        customer,
        thresholdForProgramRollup,
      }).map((row) => row.label);
      expect(labels.join("|")).not.toContain("Pest Control");
    }
  });
});
