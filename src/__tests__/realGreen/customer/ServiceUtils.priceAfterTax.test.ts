import { describe, it, expect } from "vitest";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { baseServiceCore, baseAssignmentUtils } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { baseCustomerNoX } from "@/app/realGreen/customer/_lib/entities/bases/baseCustomer";
import { baseProgramNoX } from "@/app/realGreen/customer/_lib/entities/bases/baseProgram";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { ProgramUtils } from "@/app/realGreen/customer/_lib/classes/ProgramUtils";
import { sampleServCode01 } from "@/app/realGreen/sampleData/sampleServCodes";
import {
  sampleServiceDiscount2,
  sampleProgramDiscount,
} from "@/app/realGreen/sampleData/sampleDiscounts";
import { baseLoadout } from "@/app/loadout/LoadoutTypes";
import type { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import type { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

// ---------------------------------------------------------------------------
// CRM reference data (Prepay Calculator screenshots, $27.00 per service, taxRate 7.375%)
// ---------------------------------------------------------------------------

const TAX_RATE = 7.375;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCustomerWithTaxRate(taxRate: number): Customer {
  const noX: Omit<Customer, "x"> = { ...baseCustomerNoX, taxRate };
  return { ...noX, x: new CustomerUtils(noX) };
}

function makeProgramWithDiscount({
  discount,
  customer,
}: {
  discount: Program["discount"];
  customer: Customer;
}): Program {
  const noX: Omit<Program, "x"> = { ...baseProgramNoX, discount, customer };
  return { ...noX, x: new ProgramUtils(noX) };
}

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

// ---------------------------------------------------------------------------
// Tests — wiring: ServiceUtils.priceAfterTax delegates to calculatePrepayServTotal
// ---------------------------------------------------------------------------

describe("ServiceUtils.priceAfterTax", () => {
  const customer = makeCustomerWithTaxRate(TAX_RATE);

  /**
   * Scenario 1: No discount, no prepay.
   * Expected net per service: $29.00 (CRM screenshot 1)
   */
  it("returns correct net with no discount and no prepay (CRM: $29.00)", () => {
    const program = makeProgramWithDiscount({ discount: null, customer });
    const service = makeService({ price: 27.00, serviceDiscount: null, program });

    expect(service.x.priceAfterTax()).toBe(29.00);
  });

  /**
   * Scenario 2: 10% program discount, no prepay.
   * Expected net per service: $26.09 (CRM screenshot 2)
   */
  it("returns correct net with 10% program discount and no prepay (CRM: $26.09)", () => {
    const program = makeProgramWithDiscount({ discount: sampleProgramDiscount, customer });
    const service = makeService({ price: 27.00, serviceDiscount: null, program });

    expect(service.x.priceAfterTax()).toBe(26.09);
  });

  /**
   * Scenario 3: 5% program discount (via service discount of same rate), no prepay.
   * Expected net per service: $27.54 (CRM screenshot 3)
   */
  it("returns correct net with 5% discount and no prepay (CRM: $27.54)", () => {
    const program = makeProgramWithDiscount({ discount: null, customer });
    const service = makeService({ price: 27.00, serviceDiscount: sampleServiceDiscount2, program });

    expect(service.x.priceAfterTax()).toBe(27.54);
  });

  /**
   * Scenario 4: No service/program discount, 5% prepay.
   * Expected net per service: $27.54 (CRM screenshot 4)
   */
  it("returns correct net with no discount and 5% prepay (CRM: $27.54)", () => {
    const program = makeProgramWithDiscount({ discount: null, customer });
    const service = makeService({ price: 27.00, serviceDiscount: null, program });

    expect(service.x.priceAfterTax(5)).toBe(27.54);
  });
});
