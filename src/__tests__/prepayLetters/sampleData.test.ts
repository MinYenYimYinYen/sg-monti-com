import { describe, it, expect } from "vitest";
import { sampleCustomer } from "@/app/prepayLetters/template/sampleData/sampleCustomer";
import { samplePrepayConfig } from "@/app/prepayLetters/template/sampleData/samplePrepayConfig";
import { samplePrepayLetterData } from "@/app/prepayLetters/template/sampleData/samplePrepayLetterData";
import {
  calculatePrepayTotals,
  getInstallmentPrograms,
  getPrepayPrograms,
} from "@/app/prepayLetters/pricing/installmentSegregation";
import { getStubTotals } from "@/app/prepayLetters/pricing/stubTotals";
import { getUpsellLetterPricing } from "@/app/prepayLetters/pricing/upsellPricing";

// The preview data feeds the template editor, so these tests keep it valid: every slot
// of the letter has something to show.

describe("sampleCustomer (template editor preview)", () => {
  it("has exactly one installment program so the installment slot shows in the editor", () => {
    expect(getInstallmentPrograms(sampleCustomer)).toHaveLength(1);
    expect(getPrepayPrograms(sampleCustomer)).toHaveLength(3);
  });

  it("prices only the non-installment programs", () => {
    const [lawn, insect, mosquito] = sampleCustomer.programs;

    const totals = calculatePrepayTotals({
      programs: getPrepayPrograms(sampleCustomer),
      prepayPercent: 5,
    });

    const expectedServiceAmt =
      lawn!.x.getPriceAfterDiscounts("price") +
      insect!.x.getPriceAfterDiscounts("price") +
      mosquito!.x.getPriceAfterDiscounts("price");
    expect(totals.serviceAmt).toBe(expectedServiceAmt);
  });

  it("has a credit balance so the credit line shows in the editor", () => {
    expect(sampleCustomer.netBalance).toBeLessThan(0);
    expect(samplePrepayConfig.showCreditBalance).toBe(true);
  });
});

describe("samplePrepayLetterData", () => {
  it("prices the upsell, so the upsell slots show in the editor", () => {
    const pricing = getUpsellLetterPricing({
      customer: samplePrepayLetterData.customer,
      upsell: samplePrepayLetterData.upsell,
      prepayPercent: samplePrepayLetterData.config.upsellPrepayDiscPercent,
    });

    expect(pricing).not.toBeNull();
  });

  it("totals the stub for both sources", () => {
    for (const totalsSource of ["current", "upsell"] as const) {
      const totals = getStubTotals({
        customer: samplePrepayLetterData.customer,
        config: samplePrepayLetterData.config,
        upsell: samplePrepayLetterData.upsell,
        totalsSource,
      });

      expect(totals.total).toBeGreaterThan(0);
    }
  });
});
