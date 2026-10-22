import { describe, it, expect } from "vitest";
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";

function makeProgramWithBillingType(billingType: string) {
  const customer = generateCustomer({
    programs: [
      {
        core: { billingType },
        services: [{ core: { price: 100 } }],
      },
    ],
  });
  return customer.programs[0]!;
}

describe("ProgramUtils billing type getters", () => {
  it("treats regular invoice (R) as neither installment nor autopay", () => {
    const program = makeProgramWithBillingType(BILLING_TYPE.RegularInvoice);

    expect(program.x.isInstallment).toBe(false);
    expect(program.x.isAutopay).toBe(false);
  });

  it("treats auto credit card (A) as autopay only", () => {
    const program = makeProgramWithBillingType(BILLING_TYPE.AutoCreditCard);

    expect(program.x.isInstallment).toBe(false);
    expect(program.x.isAutopay).toBe(true);
  });

  it("treats installment (C) as installment only", () => {
    const program = makeProgramWithBillingType(BILLING_TYPE.Installment);

    expect(program.x.isInstallment).toBe(true);
    expect(program.x.isAutopay).toBe(false);
  });

  it("treats an empty billing type as neither", () => {
    const program = makeProgramWithBillingType("");

    expect(program.x.isInstallment).toBe(false);
    expect(program.x.isAutopay).toBe(false);
  });

  it("treats an unrecognized billing type as neither", () => {
    const program = makeProgramWithBillingType("Z");

    expect(program.x.isInstallment).toBe(false);
    expect(program.x.isAutopay).toBe(false);
  });
});

describe("ServiceUtils billing type getters", () => {
  it("delegates to the service's program", () => {
    const customer = generateCustomer({
      programs: [
        {
          core: { billingType: BILLING_TYPE.Installment },
          services: [{ core: { price: 100 } }],
        },
        {
          core: { billingType: BILLING_TYPE.AutoCreditCard },
          services: [{ core: { price: 100 } }],
        },
        {
          core: { billingType: BILLING_TYPE.RegularInvoice },
          services: [{ core: { price: 100 } }],
        },
      ],
    });
    const [installmentService, autopayService, regularService] =
      customer.programs.map((program) => program.services[0]!);

    expect(installmentService.x.isInstallment).toBe(true);
    expect(installmentService.x.isAutopay).toBe(false);
    expect(autopayService.x.isInstallment).toBe(false);
    expect(autopayService.x.isAutopay).toBe(true);
    expect(regularService.x.isInstallment).toBe(false);
    expect(regularService.x.isAutopay).toBe(false);
  });
});
