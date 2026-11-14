import { describe, it, expect } from "vitest";
import { makeCustomer } from "@/_builders/makeCustomer";
import { makePrepayConfig } from "@/_builders/makePrepayConfig";
import { makeTaxCode } from "@/_builders/makeTaxCode";
import { makeUpsellProgCode } from "@/__tests__/prepayLetters/prepayTestHelpers";
import {
  getBalanceAdjustment,
  getTotalDue,
} from "@/app/prepayLetters/pricing/balanceAdjustment";
import { getStubTotals } from "@/app/prepayLetters/pricing/stubTotals";

const bothOn = makePrepayConfig({
  showCreditBalance: true,
  showRemitBalance: true,
  stdPrepayDiscPercent: 5,
  upsellPrepayDiscPercent: 10,
});
const bothOff = {
  ...bothOn,
  showCreditBalance: false,
  showRemitBalance: false,
};
const upsell = makeUpsellProgCode();

/** One $100 service, so the stub totals have something to price. */
function makeCustomerWithBalance(netBalance: number) {
  return makeCustomer({
    core: { size: 15, netBalance },
    taxCodes: [makeTaxCode({ taxRate: 7.375 })],
    programs: [{ services: [{ core: { price: 100 } }] }],
  });
}

describe("getBalanceAdjustment", () => {
  it("negative balance is a credit when showCreditBalance is on", () => {
    expect(
      getBalanceAdjustment({
        customer: makeCustomerWithBalance(-25),
        config: bothOn,
      }),
    ).toEqual({ creditBalance: 25, remitBalance: 0 });
  });

  it("negative balance is ignored when showCreditBalance is off", () => {
    expect(
      getBalanceAdjustment({
        customer: makeCustomerWithBalance(-25),
        config: { ...bothOn, showCreditBalance: false },
      }),
    ).toEqual({ creditBalance: 0, remitBalance: 0 });
  });

  it("positive balance is a remit balance when showRemitBalance is on", () => {
    expect(
      getBalanceAdjustment({
        customer: makeCustomerWithBalance(40),
        config: bothOn,
      }),
    ).toEqual({ creditBalance: 0, remitBalance: 40 });
  });

  it("positive balance is ignored when showRemitBalance is off", () => {
    expect(
      getBalanceAdjustment({
        customer: makeCustomerWithBalance(40),
        config: { ...bothOn, showRemitBalance: false },
      }),
    ).toEqual({ creditBalance: 0, remitBalance: 0 });
  });

  it("zero balance never applies", () => {
    expect(
      getBalanceAdjustment({
        customer: makeCustomerWithBalance(0),
        config: bothOn,
      }),
    ).toEqual({ creditBalance: 0, remitBalance: 0 });
  });
});

describe("getTotalDue", () => {
  it("subtracts credit and adds remit", () => {
    expect(
      getTotalDue({
        total: 100,
        balances: { creditBalance: 30, remitBalance: 0 },
      }),
    ).toBe(70);
    expect(
      getTotalDue({
        total: 100,
        balances: { creditBalance: 0, remitBalance: 15 },
      }),
    ).toBe(115);
  });
});

describe("getStubTotals with balances", () => {
  for (const totalsSource of ["current", "upsell"] as const) {
    it(`${totalsSource}: total includes credit and remit, other fields unchanged`, () => {
      const base = getStubTotals({
        customer: makeCustomerWithBalance(0),
        config: bothOff,
        upsell,
        totalsSource,
      });
      const credit = getStubTotals({
        customer: makeCustomerWithBalance(-10),
        config: bothOn,
        upsell,
        totalsSource,
      });
      const remit = getStubTotals({
        customer: makeCustomerWithBalance(10),
        config: bothOn,
        upsell,
        totalsSource,
      });
      expect(credit.total).toBeCloseTo(base.total - 10, 2);
      expect(remit.total).toBeCloseTo(base.total + 10, 2);
      expect(credit.prepayDisc).toBe(base.prepayDisc);
    });
  }
});
