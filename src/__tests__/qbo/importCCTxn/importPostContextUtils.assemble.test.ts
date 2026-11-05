import { describe, expect, it } from "vitest";
import { assembleCheckInput, buildCandidates } from "@/app/qbo/importCCTxn/_lib/importPostContextUtils";
import {
  makeCardAccount,
  makeExpenseAccount,
  makeMapping,
  makeRow,
} from "@/__tests__/qbo/importCCTxn/importTestHelpers";
import { makeContext } from "@/__tests__/qbo/importCCTxn/postContextTestHelpers";

describe("assembleCheckInput", () => {
  it("finds the mapping from the description by the current rules, not the stored key", () => {
    const row = makeRow({ description: "ANTHROPIC", merchantKey: "A STALE KEY" });
    const input = assembleCheckInput({ row, context: makeContext() });
    expect(input.mapping?.vendorId).toBe("77");
  });

  it("uses the row's own account over the merchant's default", () => {
    const context = makeContext({
      accountMap: new Map([
        ["13", makeExpenseAccount({ Id: "13" })],
        ["99", makeExpenseAccount({ Id: "99", FullyQualifiedName: "Travel" })],
        ["42", makeCardAccount({ Id: "42" })],
      ]),
    });
    const input = assembleCheckInput({ row: makeRow({ accountId: "99" }), context });
    expect(input.expenseAccount?.Id).toBe("99");
  });

  it("uses the card's own account over the format default", () => {
    const context = makeContext({
      cardAssignmentMap: new Map([
        [
          "capitalOne:2238",
          { formatId: "capitalOne", last4: "2238", userName: "sam", accountId: "55" },
        ],
      ]),
      accountMap: new Map([
        ["13", makeExpenseAccount({ Id: "13" })],
        ["42", makeCardAccount({ Id: "42" })],
        ["55", makeCardAccount({ Id: "55", FullyQualifiedName: "Other card" })],
      ]),
    });
    expect(assembleCheckInput({ row: makeRow(), context }).cardAccount?.Id).toBe("55");
  });

  it("finds nothing for a merchant with no mapping", () => {
    const row = makeRow({ description: "UNMAPPED SHOP" });
    const input = assembleCheckInput({ row, context: makeContext() });
    expect(input).toMatchObject({ mapping: null, vendor: null, expenseAccount: null });
  });

  it("passes the books-closed date through", () => {
    const input = assembleCheckInput({
      row: makeRow(),
      context: makeContext({ bookCloseDate: "2023-12-31" }),
    });
    expect(input.bookCloseDate).toBe("2023-12-31");
  });
});

describe("buildCandidates", () => {
  it("marks a row confirmed only when its own description is listed on the mapping", () => {
    const mapping = makeMapping({ merchantKey: "ANTHROPIC", confirmedMerchants: ["ANTHROPIC"] });
    const context = makeContext({ mappingMap: new Map([["ANTHROPIC", mapping]]) });
    const [confirmed] = buildCandidates({ rows: [makeRow({ description: "Anthropic" })], context });
    expect(confirmed?.isConfirmed).toBe(true);
  });

  it("marks a row unconfirmed when the mapping does not list its description", () => {
    const [candidate] = buildCandidates({ rows: [makeRow()], context: makeContext() });
    expect(candidate?.isConfirmed).toBe(false);
    expect(candidate?.problems).toEqual([]);
  });

  it("carries a row's problems", () => {
    const [candidate] = buildCandidates({
      rows: [makeRow({ description: "UNMAPPED SHOP" })],
      context: makeContext(),
    });
    expect(candidate?.problems.length).toBeGreaterThan(0);
  });
});
