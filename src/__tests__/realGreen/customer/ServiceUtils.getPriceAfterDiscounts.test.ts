import { describe, it, expect } from "vitest";
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import {
  sampleServiceDiscount,
  sampleServiceDiscount2,
  sampleProgramDiscount,
} from "@/app/realGreen/sampleData/sampleDiscounts";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ServiceUtils.getPriceAfterDiscounts", () => {
  /**
   * Scenario 1: Only a service-level discount is present.
   * Service: $100, service discount: $15 DOLLAR off, program discount: none.
   * Expected: 100 - 15 = 85
   */
  it("applies a service-level dollar discount when only the service has a discount", () => {
    const customer = generateCustomer({
      programs: [{
        services: [{
          core: { price: 100 },
          discount: sampleServiceDiscount, // $15 DOLLAR
        }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    expect(service.x.getPriceAfterDiscounts("price")).toBe(85);
  });

  /**
   * Scenario 2: Only a program-level discount is present.
   * Service: $150, service discount: none, program discount: 10% PERCENT.
   * Expected: 150 - round(150 × 0.10 × 100)/100 = 150 - 15 = 135
   */
  it("applies a program-level percent discount when only the program has a discount", () => {
    const customer = generateCustomer({
      programs: [{
        discount: sampleProgramDiscount, // 10% PERCENT
        services: [{
          core: { price: 150 },
        }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    expect(service.x.getPriceAfterDiscounts("price")).toBe(135);
  });

  /**
   * Scenario 3: Both service-level and program-level discounts are present (they stack).
   * Service: $150, service discount: 5% PERCENT, program discount: 10% PERCENT.
   *
   * applicableDiscounts should contain exactly [sampleServiceDiscount2, sampleProgramDiscount]
   * in that order (service first, then program).
   *
   * applyDiscounts sums each discount individually (rounded per-discount):
   *   service discount: round(150 × 0.05 × 100)/100 = 7.50
   *   program discount: round(150 × 0.10 × 100)/100 = 15.00
   *   total discount = 22.50
   * Expected price: 150 - 22.50 = 127.50
   */
  it("stacks service-level and program-level discounts when both are present", () => {
    const customer = generateCustomer({
      programs: [{
        discount: sampleProgramDiscount, // 10% PERCENT
        services: [{
          core: { price: 150 },
          discount: sampleServiceDiscount2, // 5% PERCENT
        }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    // Confirm the correct discounts are collected — service first, then program.
    expect(service.x.applicableDiscounts).toEqual([
      sampleServiceDiscount2,
      sampleProgramDiscount,
    ]);

    expect(service.x.getPriceAfterDiscounts("price")).toBe(127.5);
  });

  /**
   * Scenario 3 (customer discount excluded): The customer-level discount must NOT
   * appear in applicableDiscounts — it is advisory only (default for new programs).
   */
  it("does not include the customer-level discount in applicableDiscounts", () => {
    const customer = generateCustomer({
      programs: [{
        discount: sampleProgramDiscount, // 10% PERCENT
        services: [{
          core: { price: 150 },
          discount: sampleServiceDiscount2, // 5% PERCENT
        }],
      }],
    });
    const service = customer.programs[0]!.services[0]!;

    const discountIds = service.x.applicableDiscounts.map((d) => d.discountId);
    expect(discountIds).not.toContain("CUST-DISC-5");
    expect(service.x.applicableDiscounts).toHaveLength(2);
  });
});
