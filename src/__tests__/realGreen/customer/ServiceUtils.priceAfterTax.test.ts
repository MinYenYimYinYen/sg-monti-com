import { describe, it, expect } from "vitest";
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import {
  sampleServiceDiscount2,
  sampleProgramDiscount,
} from "@/app/realGreen/sampleData/sampleDiscounts";
import type { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";

// ---------------------------------------------------------------------------
// CRM reference data (Prepay Calculator screenshots, $27.00 per service, taxRate 7.375%)
// ---------------------------------------------------------------------------

const TAX_RATE = 7.375;

/** Builds a minimal TaxCode for the given rate. */
function makeTaxCode(rate: number): TaxCode {
  return {
    taxCodeId: `TX-${rate}`,
    taxRate: rate,
    available: true,
    createdAt: "",
    updatedAt: "",
  };
}

// ---------------------------------------------------------------------------
// Tests — wiring: ServiceUtils.priceAfterTax delegates to calculatePrepayServTotal
// ---------------------------------------------------------------------------

describe("ServiceUtils.priceAfterTax", () => {
  /**
   * Scenario 1: No discount, no prepay.
   * Expected net per service: $29.00 (CRM screenshot 1)
   */
  it("returns correct net with no discount and no prepay (CRM: $29.00)", () => {
    const customer = generateCustomer({
      taxCodes: [makeTaxCode(TAX_RATE)],
      programs: [{
        services: [{ core: { price: 27.00 } }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    expect(service.x.priceAfterTax()).toBe(29.00);
  });

  /**
   * Scenario 2: 10% program discount, no prepay.
   * Expected net per service: $26.09 (CRM screenshot 2)
   */
  it("returns correct net with 10% program discount and no prepay (CRM: $26.09)", () => {
    const customer = generateCustomer({
      taxCodes: [makeTaxCode(TAX_RATE)],
      programs: [{
        discount: sampleProgramDiscount,
        services: [{ core: { price: 27.00 } }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    expect(service.x.priceAfterTax()).toBe(26.09);
  });

  /**
   * Scenario 3: 5% service discount, no prepay.
   * Expected net per service: $27.54 (CRM screenshot 3)
   */
  it("returns correct net with 5% discount and no prepay (CRM: $27.54)", () => {
    const customer = generateCustomer({
      taxCodes: [makeTaxCode(TAX_RATE)],
      programs: [{
        services: [{
          core: { price: 27.00 },
          discount: sampleServiceDiscount2, // 5% PERCENT
        }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    expect(service.x.priceAfterTax()).toBe(27.54);
  });

  /**
   * Scenario 4: No service/program discount, 5% prepay.
   * Expected net per service: $27.54 (CRM screenshot 4)
   */
  it("returns correct net with no discount and 5% prepay (CRM: $27.54)", () => {
    const customer = generateCustomer({
      taxCodes: [makeTaxCode(TAX_RATE)],
      programs: [{
        services: [{ core: { price: 27.00 } }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    expect(service.x.priceAfterTax(5)).toBe(27.54);
  });
});
