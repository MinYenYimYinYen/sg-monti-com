import { describe, it, expect } from "vitest";
import { makeCustomer } from "@/_builders/makeCustomer";
import { makeDiscount } from "@/_builders/makeDiscount";
import { makeTaxCode } from "@/_builders/makeTaxCode";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";
import { DiscountType } from "@/app/realGreen/discount/DiscountTypes";
import {
  buildInstallmentNotice,
  calculatePrepayTotals,
  getInstallmentPrograms,
  getPrepayPrograms,
} from "@/app/prepayLetters/pricing/installmentSegregation";

const TAX_RATE = 7.375;

const programDiscount = makeDiscount({ discountType: DiscountType.PERCENT, amount: 10 });

/** One regular program ($27 service, CRM: $29.00 net) plus one installment program. */
function makeMixedCustomer() {
  return makeCustomer({
    taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
    programs: [
      {
        core: { billingType: BILLING_TYPE.RegularInvoice },
        progCode: { description: "Lawn Care Program" },
        services: [{ core: { price: 27.0 } }],
      },
      {
        core: { billingType: BILLING_TYPE.Installment },
        progCode: { description: "Tree Care Program" },
        discount: programDiscount,
        services: [{ core: { price: 900.0 } }, { core: { price: 900.0 } }],
      },
    ],
  });
}

describe("getPrepayPrograms / getInstallmentPrograms", () => {
  it("splits a mixed customer by billing type", () => {
    const customer = makeMixedCustomer();

    expect(
      getPrepayPrograms(customer).map((p) => p.progCode.description),
    ).toEqual(["Lawn Care Program"]);
    expect(
      getInstallmentPrograms(customer).map((p) => p.progCode.description),
    ).toEqual(["Tree Care Program"]);
  });

  it("treats autopay, empty and unknown billing types as prepay-eligible", () => {
    const customer = makeCustomer({
      programs: [
        { core: { billingType: BILLING_TYPE.AutoCreditCard }, services: [] },
        { core: { billingType: "" }, services: [] },
        { core: { billingType: "Z" }, services: [] },
      ],
    });

    expect(getPrepayPrograms(customer)).toHaveLength(3);
    expect(getInstallmentPrograms(customer)).toHaveLength(0);
  });

  it("returns an empty prepay list when every program is installment", () => {
    const customer = makeCustomer({
      programs: [
        { core: { billingType: BILLING_TYPE.Installment }, services: [] },
      ],
    });

    expect(getPrepayPrograms(customer)).toHaveLength(0);
    expect(getInstallmentPrograms(customer)).toHaveLength(1);
  });
});

describe("calculatePrepayTotals", () => {
  it("excludes installment programs from totals (CRM: $29.00 for one $27.00 service)", () => {
    const customer = makeMixedCustomer();

    const totals = calculatePrepayTotals({
      programs: getPrepayPrograms(customer),
      prepayPercent: 0,
    });

    expect(totals.serviceAmt).toBe(27.0);
    expect(totals.prepayDisc).toBe(0);
    expect(totals.total).toBe(29.0);
  });

  it("matches a customer that only has the regular program", () => {
    const mixed = makeMixedCustomer();
    const regularOnly = makeCustomer({
      taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
      programs: [
        {
          core: { billingType: BILLING_TYPE.RegularInvoice },
          services: [{ core: { price: 27.0 } }],
        },
      ],
    });

    const mixedTotals = calculatePrepayTotals({
      programs: getPrepayPrograms(mixed),
      prepayPercent: 5,
    });
    const regularTotals = calculatePrepayTotals({
      programs: regularOnly.programs,
      prepayPercent: 5,
    });

    expect(mixedTotals).toEqual(regularTotals);
  });

  it("equals the customer-wide totals when there are no installment programs", () => {
    const customer = makeCustomer({
      taxCodes: [makeTaxCode({ taxRate: TAX_RATE })],
      programs: [
        {
          discount: programDiscount,
          services: [{ core: { price: 27.0 } }],
        },
        { services: [{ core: { price: 50.0 } }, { core: { price: 50.0 } }] },
      ],
    });
    const prepayPercent = 5;

    const totals = calculatePrepayTotals({
      programs: getPrepayPrograms(customer),
      prepayPercent,
    });

    expect(totals.serviceAmt).toBe(customer.x.getPriceAfterDiscounts("price"));
    expect(totals.prepayDisc).toBe(customer.x.prepayDiscountAmt(prepayPercent));
    expect(totals.afterPrepay).toBe(customer.x.priceAfterPrepay(prepayPercent));
    expect(totals.tax).toBe(customer.x.taxAmt(prepayPercent));
    expect(totals.total).toBe(customer.x.priceAfterTax(prepayPercent));
  });

  it("returns zeros when there are no programs", () => {
    expect(calculatePrepayTotals({ programs: [], prepayPercent: 5 })).toEqual({
      serviceAmt: 0,
      prepayDisc: 0,
      afterPrepay: 0,
      tax: 0,
      total: 0,
    });
  });
});

describe("buildInstallmentNotice", () => {
  it("returns null when there are no installment programs", () => {
    expect(buildInstallmentNotice({ programs: [] })).toBeNull();
  });

  it("names each installment program", () => {
    const customer = makeCustomer({
      programs: [
        {
          core: { billingType: BILLING_TYPE.Installment },
          progCode: { description: "Tree Care Program" },
          services: [],
        },
        {
          core: { billingType: BILLING_TYPE.Installment },
          progCode: { description: "Mosquito Program" },
          services: [],
        },
      ],
    });

    const notice = buildInstallmentNotice({
      programs: getInstallmentPrograms(customer),
    });

    expect(notice).toContain("Tree Care Program");
    expect(notice).toContain("Mosquito Program");
    expect(notice).toContain("monthly installments");
  });

  it("never includes prices — the notice contains no digits or currency symbols", () => {
    const customer = makeMixedCustomer();

    const notice = buildInstallmentNotice({
      programs: getInstallmentPrograms(customer),
    });

    expect(notice).not.toBeNull();
    expect(notice).not.toMatch(/\d/);
    expect(notice).not.toContain("$");
  });

  it("leaves contact wording to the separate contactUs slot", () => {
    const customer = makeMixedCustomer();

    const notice = buildInstallmentNotice({
      programs: getInstallmentPrograms(customer),
    });

    expect(notice).not.toBeNull();
    expect(notice!.toLowerCase()).not.toContain("contact");
  });
});
