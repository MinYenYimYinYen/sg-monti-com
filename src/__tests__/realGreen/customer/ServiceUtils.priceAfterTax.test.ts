import { describe, it, expect } from "vitest";
import { makeCustomer } from "@/_builders/makeCustomer";
import { makeDiscount } from "@/_builders/makeDiscount";
import { makeTaxCode } from "@/_builders/makeTaxCode";
import { DiscountType } from "@/app/realGreen/discount/DiscountTypes";

// ---------------------------------------------------------------------------
// CRM reference data (Prepay Calculator screenshots, $27.00 per service, taxRate 7.375%)
// ---------------------------------------------------------------------------

const TAX_RATE = 7.375;

const programDiscount = makeDiscount({ discountType: DiscountType.PERCENT, amount: 10 });
const servicePercentDiscount = makeDiscount({ discountType: DiscountType.PERCENT, amount: 5 });

// ---------------------------------------------------------------------------
// Tests — wiring: ServiceUtils.priceAfterTax delegates to calculatePrepayServTotal
// ---------------------------------------------------------------------------

describe("ServiceUtils.priceAfterTax", () => {
  /**
   * Scenario 1: No discount, no prepay.
   * Expected net per service: $29.00 (CRM screenshot 1)
   */
  it("returns correct net with no discount and no prepay (CRM: $29.00)", () => {
    const customer = makeCustomer({
      taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
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
    const customer = makeCustomer({
      taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
      programs: [{
        discount: programDiscount,
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
    const customer = makeCustomer({
      taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
      programs: [{
        services: [{
          core: { price: 27.00 },
          discount: servicePercentDiscount, // 5% PERCENT
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
    const customer = makeCustomer({
      taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
      programs: [{
        services: [{ core: { price: 27.00 } }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    expect(service.x.priceAfterTax(5)).toBe(27.54);
  });
});
