import { describe, it, expect } from "vitest";
import { calculateTax, calculatePrepayServTotal } from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import {
  sampleServiceDiscount,
  sampleServiceDiscount2,
  sampleProgramDiscount,
} from "@/app/realGreen/sampleData/sampleDiscounts";

// ---------------------------------------------------------------------------
// CRM reference data (Prepay Calculator screenshots, 3 services × $27.00, taxRate 7.375%)
//
// Per-service values observed in the CRM:
//   Scenario 1: no discount, no prepay  → tax $2.00, net $29.00
//   Scenario 2: 10% program discount    → tax $1.79, net $26.09
//   Scenario 3: 5% program discount     → tax $1.89, net $27.54
//   Scenario 4: 5% prepay (no discount) → tax $1.89, net $27.54
// ---------------------------------------------------------------------------

const TAX_RATE = 7.375; // percent

// ---------------------------------------------------------------------------
// calculateTax — pure rounding rule
// ---------------------------------------------------------------------------

describe("calculateTax", () => {
  /**
   * No discount present → ceil(rawTax × 100) / 100
   * 27.00 × 0.07375 = 1.99125 → ceil = 2.00
   */
  it("uses ceil when no discount is present", () => {
    expect(calculateTax({ price: 27.00, taxRate: TAX_RATE, hasDiscount: false })).toBe(2.00);
  });

  /**
   * Discount present → round(rawTax × 100) / 100
   * 24.30 × 0.07375 = 1.792125 → round = 1.79
   */
  it("uses round when a discount is present (10% off $27 → $24.30)", () => {
    expect(calculateTax({ price: 24.30, taxRate: TAX_RATE, hasDiscount: true })).toBe(1.79);
  });

  /**
   * Discount present → round
   * 25.65 × 0.07375 = 1.891688 → round = 1.89
   */
  it("uses round when a discount is present (5% off $27 → $25.65)", () => {
    expect(calculateTax({ price: 25.65, taxRate: TAX_RATE, hasDiscount: true })).toBe(1.89);
  });

  it("returns 0 when taxRate is 0", () => {
    expect(calculateTax({ price: 100, taxRate: 0, hasDiscount: false })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculatePrepayServTotal — full pipeline per service
// ---------------------------------------------------------------------------

describe("calculatePrepayServTotal", () => {
  /**
   * Scenario 1: No service/program discount, no prepay.
   * price=27, discounts=[], prepayPercent=0, taxRate=7.375
   * → priceAfterDiscounts=27, prepayAmt=0, postPrepay=27
   * → hasDiscount=false → tax=ceil(1.99125)=2.00
   * → total = 27 + 2.00 = 29.00
   */
  it("returns correct net with no discount and no prepay (CRM: $29.00)", () => {
    expect(
      calculatePrepayServTotal({
        price: 27.00,
        discounts: [],
        prepayPercent: 0,
        taxRate: TAX_RATE,
      }),
    ).toBe(29.00);
  });

  /**
   * Scenario 2: 10% program discount, no prepay.
   * price=27, discounts=[10% PERCENT], prepayPercent=0
   * → priceAfterDiscounts = 27 - round(27×0.10×100)/100 = 27 - 2.70 = 24.30
   * → prepayAmt=0, postPrepay=24.30
   * → hasDiscount=true → tax=round(1.792125)=1.79
   * → total = 24.30 + 1.79 = 26.09
   */
  it("returns correct net with 10% program discount and no prepay (CRM: $26.09)", () => {
    expect(
      calculatePrepayServTotal({
        price: 27.00,
        discounts: [sampleProgramDiscount],
        prepayPercent: 0,
        taxRate: TAX_RATE,
      }),
    ).toBe(26.09);
  });

  /**
   * Scenario 3: 5% program discount, no prepay.
   * price=27, discounts=[5% PERCENT], prepayPercent=0
   * → priceAfterDiscounts = 27 - round(27×0.05×100)/100 = 27 - 1.35 = 25.65
   * → prepayAmt=0, postPrepay=25.65
   * → hasDiscount=true → tax=round(1.891688)=1.89
   * → total = 25.65 + 1.89 = 27.54
   */
  it("returns correct net with 5% program discount and no prepay (CRM: $27.54)", () => {
    expect(
      calculatePrepayServTotal({
        price: 27.00,
        discounts: [sampleServiceDiscount2], // 5% PERCENT — same math as sampleProgramDiscount at 5%
        prepayPercent: 0,
        taxRate: TAX_RATE,
      }),
    ).toBe(27.54);
  });

  /**
   * Scenario 4: No service/program discount, 5% prepay.
   * price=27, discounts=[], prepayPercent=5
   * → priceAfterDiscounts=27 (no service/program discounts)
   * → prepayAmt = round(27×0.05×100)/100 = 1.35
   * → postPrepay = 27 - 1.35 = 25.65
   * → hasDiscount=true (prepayPercent > 0) → tax=round(1.891688)=1.89
   * → total = 25.65 + 1.89 = 27.54
   */
  it("returns correct net with no discount and 5% prepay (CRM: $27.54)", () => {
    expect(
      calculatePrepayServTotal({
        price: 27.00,
        discounts: [],
        prepayPercent: 5,
        taxRate: TAX_RATE,
      }),
    ).toBe(27.54);
  });

  /**
   * Stacked: 5% service discount + 5% prepay.
   * price=27, discounts=[5% PERCENT], prepayPercent=5
   * → priceAfterDiscounts = 27 - 1.35 = 25.65
   * → prepayAmt = round(25.65×0.05×100)/100 = round(1.2825) = 1.28
   * → postPrepay = 25.65 - 1.28 = 24.37
   * → hasDiscount=true → tax=round(24.37×0.07375)=round(1.797288)=1.80
   * → total = 24.37 + 1.80 = 26.17
   */
  it("stacks service discount and prepay correctly", () => {
    expect(
      calculatePrepayServTotal({
        price: 27.00,
        discounts: [sampleServiceDiscount2], // 5% PERCENT
        prepayPercent: 5,
        taxRate: TAX_RATE,
      }),
    ).toBeCloseTo(26.17, 2);
  });
});
