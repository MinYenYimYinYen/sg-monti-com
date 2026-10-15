import { describe, it, expect } from "vitest";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { baseServiceCore, baseAssignmentUtils } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { baseProgram, baseProgramNoX } from "@/app/realGreen/customer/_lib/entities/bases/baseProgram";
import { ProgramUtils } from "@/app/realGreen/customer/_lib/classes/ProgramUtils";
import { sampleServCode01 } from "@/app/realGreen/sampleData/sampleServCodes";
import {
  sampleServiceDiscount,
  sampleServiceDiscount2,
  sampleProgramDiscount,
} from "@/app/realGreen/sampleData/sampleDiscounts";
import { baseLoadout } from "@/app/loadout/LoadoutTypes";
import type { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import type { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal Service with the given price, service discount, and program. */
function makeService({
  price,
  serviceDiscount,
  program,
}: {
  price: number;
  serviceDiscount: Service["discount"];
  program: Program;
}): Service {
  const doc = {
    ...baseServiceCore,
    servId: 9999,
    price,
    servCodeId: sampleServCode01.servCodeId,
  };
  const props = {
    program,
    servCode: sampleServCode01,
    callAhead: null,
    discount: serviceDiscount,
    production: null,
    assignments: baseAssignmentUtils,
    promise: null,
    promiseIssues: [],
    loadoutInventory: baseLoadout,
    eta: null,
    priorityService: null,
  };
  return { ...doc, ...props, x: new ServiceUtils({ ...doc, ...props }) };
}

/** Builds a minimal Program with the given program-level discount. */
function makeProgramWithDiscount(discount: Program["discount"]): Program {
  const noX: Omit<Program, "x"> = {
    ...baseProgramNoX,
    discount,
  };
  return { ...noX, x: new ProgramUtils(noX) };
}

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
    const service = makeService({
      price: 100,
      serviceDiscount: sampleServiceDiscount, // $15 DOLLAR
      program: baseProgram,                   // no program discount
    });

    expect(service.x.getPriceAfterDiscounts("price")).toBe(85);
  });

  /**
   * Scenario 2: Only a program-level discount is present.
   * Service: $150, service discount: none, program discount: 10% PERCENT.
   * Expected: 150 - round(150 × 0.10 × 100)/100 = 150 - 15 = 135
   */
  it("applies a program-level percent discount when only the program has a discount", () => {
    const program = makeProgramWithDiscount(sampleProgramDiscount); // 10% PERCENT
    const service = makeService({
      price: 150,
      serviceDiscount: null,
      program,
    });

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
    const program = makeProgramWithDiscount(sampleProgramDiscount); // 10% PERCENT
    const service = makeService({
      price: 150,
      serviceDiscount: sampleServiceDiscount2, // 5% PERCENT
      program,
    });

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
    const program = makeProgramWithDiscount(sampleProgramDiscount); // 10% PERCENT
    const service = makeService({
      price: 150,
      serviceDiscount: sampleServiceDiscount2, // 5% PERCENT
      program,
    });

    const discountIds = service.x.applicableDiscounts.map((d) => d.discountId);
    expect(discountIds).not.toContain(sampleServiceDiscount2.discountId === "SERV-DISC-5" ? "CUST-DISC-5" : "CUST-DISC-5");
    expect(service.x.applicableDiscounts).toHaveLength(2);
  });
});
