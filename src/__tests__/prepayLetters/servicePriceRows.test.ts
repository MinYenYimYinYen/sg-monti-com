import { describe, it, expect } from "vitest";
import { sampleCustomer } from "@/app/realGreen/sampleData/sampleCustomer";
import { samplePrepayConfig } from "@/app/realGreen/sampleData/samplePrepayConfig";
import {
  buildProgramRollupLabel,
  buildServicePriceRows,
} from "@/app/prepayLetters/servicePriceRows";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/installmentSegregation";

// Sample customer: 9 prepay services across 3 programs (installment program excluded).
const SERVICE_COUNT = 9;

describe("buildServicePriceRows", () => {
  it("lists one row per service when the count equals the threshold", () => {
    const rows = buildServicePriceRows({
      customer: sampleCustomer,
      thresholdForProgramRollup: SERVICE_COUNT,
    });
    expect(rows).toHaveLength(SERVICE_COUNT);
    expect(rows[0]!.label).toBe("Early Spring Visit");
  });

  it("rolls up to one row per program when the count exceeds the threshold", () => {
    const rows = buildServicePriceRows({
      customer: sampleCustomer,
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
      customer: sampleCustomer,
      thresholdForProgramRollup: 1,
    });
    const { serviceAmt } = calculatePrepayTotals({
      programs: getPrepayPrograms(sampleCustomer),
      prepayPercent: samplePrepayConfig.stdPrepayDiscPercent,
    });
    const sum = rows.reduce((total, row) => total + row.price, 0);
    expect(sum).toBeCloseTo(serviceAmt, 2);
  });

  it("flags discounts and keeps the original price on rolled-up rows", () => {
    const rows = buildServicePriceRows({
      customer: sampleCustomer,
      thresholdForProgramRollup: 1,
    });
    const [lawn, , mosquito] = rows;
    expect(lawn!.hasDiscount).toBe(true);
    expect(lawn!.originalPrice).toBe(300);
    expect(lawn!.price).toBeLessThan(300);
    expect(mosquito!.hasDiscount).toBe(false);
    expect(mosquito!.originalPrice).toBe(200);
    expect(mosquito!.price).toBe(200);
  });

  it("excludes installment programs in both modes", () => {
    for (const thresholdForProgramRollup of [1, 50]) {
      const labels = buildServicePriceRows({
        customer: sampleCustomer,
        thresholdForProgramRollup,
      }).map((row) => row.label);
      expect(labels.join("|")).not.toContain("Tree & Shrub");
    }
  });
});
