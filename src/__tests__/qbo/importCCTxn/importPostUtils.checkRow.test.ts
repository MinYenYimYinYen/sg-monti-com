import { describe, expect, it } from "vitest";
import { checkRowReadyToPost, PostCheckInput } from "@/app/qbo/importCCTxn/_lib/importPostUtils";
import {
  makeCardAccount,
  makeExpenseAccount,
  makeMapping,
  makeRow,
  makeVendorSummary,
} from "@/__tests__/qbo/importCCTxn/importTestHelpers";

function readyInput(overrides: Partial<PostCheckInput> = {}): PostCheckInput {
  return {
    row: makeRow(),
    mapping: makeMapping(),
    vendor: makeVendorSummary(),
    expenseAccount: makeExpenseAccount(),
    cardAccount: makeCardAccount(),
    bookCloseDate: null,
    ...overrides,
  };
}

describe("checkRowReadyToPost: a row that can be posted", () => {
  it("has no problems and no warnings when everything resolves", () => {
    expect(checkRowReadyToPost(readyInput())).toEqual({ problems: [], warnings: [] });
  });

  it("lets a failed row be posted again, since a failed row is certain not to be in QuickBooks", () => {
    const check = checkRowReadyToPost(readyInput({ row: makeRow({ status: "failed" }) }));
    expect(check.problems).toEqual([]);
  });
});

describe("checkRowReadyToPost: row status", () => {
  it.each(["posted", "posting", "skipped", "unknown"] as const)(
    "blocks a row that is %s",
    (status) => {
      const check = checkRowReadyToPost(readyInput({ row: makeRow({ status }) }));
      expect(check.problems).toEqual([`The row is ${status}, so it cannot be posted.`]);
    },
  );
});

describe("checkRowReadyToPost: row content", () => {
  it.each(["payment", "refund"] as const)("blocks a %s, since only charges are posted", (kind) => {
    const check = checkRowReadyToPost(readyInput({ row: makeRow({ kind }) }));
    expect(check.problems).toContain("Only charges are posted.");
  });

  it.each([0, -500, 95.5, Number.NaN])("blocks an amount of %s cents", (amountCents) => {
    const check = checkRowReadyToPost(readyInput({ row: makeRow({ amountCents }) }));
    expect(check.problems).toContain("The amount must be greater than zero.");
  });
});

describe("checkRowReadyToPost: mapping, vendor and accounts", () => {
  it("blocks a merchant with no mapping, without also complaining about the vendor and account", () => {
    const check = checkRowReadyToPost(
      readyInput({ mapping: null, vendor: null, expenseAccount: null }),
    );
    expect(check.problems).toEqual(["The merchant has no vendor and account mapped yet."]);
  });

  it("blocks a mapped vendor that is not in QuickBooks", () => {
    const check = checkRowReadyToPost(readyInput({ vendor: null }));
    expect(check.problems).toEqual(["The mapped vendor is not in QuickBooks."]);
  });

  it("blocks an inactive vendor, naming it", () => {
    const check = checkRowReadyToPost(
      readyInput({ vendor: makeVendorSummary({ DisplayName: "Anthropic", Active: false }) }),
    );
    expect(check.problems).toEqual(['The vendor "Anthropic" is inactive.']);
  });

  it("blocks an expense account that is not in QuickBooks", () => {
    const check = checkRowReadyToPost(readyInput({ expenseAccount: null }));
    expect(check.problems).toEqual(["The expense account is not in QuickBooks."]);
  });

  it("blocks an account that is not an expense account, such as one picked for a single row", () => {
    const check = checkRowReadyToPost(
      readyInput({
        expenseAccount: makeExpenseAccount({
          FullyQualifiedName: "Checking",
          AccountType: "Bank",
          Classification: "Asset",
        }),
      }),
    );
    expect(check.problems).toEqual(['"Checking" is not an expense account.']);
  });

  it("blocks an account with no classification, which QuickBooks omits for non-posting accounts", () => {
    const check = checkRowReadyToPost(
      readyInput({
        expenseAccount: makeExpenseAccount({ FullyQualifiedName: "Header", Classification: undefined }),
      }),
    );
    expect(check.problems).toEqual(['"Header" is not an expense account.']);
  });

  it("accepts cost of goods sold and other expense, which are classified as expenses", () => {
    const check = checkRowReadyToPost(
      readyInput({
        expenseAccount: makeExpenseAccount({ AccountType: "Cost of Goods Sold", Classification: "Expense" }),
      }),
    );
    expect(check.problems).toEqual([]);
  });

  it("blocks an inactive expense account, naming it", () => {
    const check = checkRowReadyToPost(
      readyInput({
        expenseAccount: makeExpenseAccount({ FullyQualifiedName: "Office:Software", Active: false }),
      }),
    );
    expect(check.problems).toEqual(['The expense account "Office:Software" is inactive.']);
  });

  it("blocks a card with no credit card account set", () => {
    const check = checkRowReadyToPost(readyInput({ cardAccount: null }));
    expect(check.problems).toEqual([
      "No credit card account is set for this card. Set it in Settings.",
    ]);
  });

  it("blocks an inactive card account, naming it", () => {
    const check = checkRowReadyToPost(
      readyInput({ cardAccount: makeCardAccount({ FullyQualifiedName: "Discover", Active: false }) }),
    );
    expect(check.problems).toEqual(['The card account "Discover" is inactive.']);
  });

  it("reports every problem at once, so a user can fix them in one pass", () => {
    const check = checkRowReadyToPost(
      readyInput({
        row: makeRow({ status: "posted", kind: "refund" }),
        vendor: null,
        expenseAccount: null,
        cardAccount: null,
      }),
    );
    expect(check.problems).toHaveLength(5);
  });
});

describe("checkRowReadyToPost: books-closed date", () => {
  const withDate = ({
    transactionDate,
    bookCloseDate,
    postedDate,
  }: {
    transactionDate: string;
    bookCloseDate: string | null;
    postedDate?: string;
  }) =>
    checkRowReadyToPost(
      readyInput({ row: makeRow({ transactionDate, ...(postedDate ? { postedDate } : {}) }), bookCloseDate }),
    );

  it("warns, without blocking, when the transaction is on the books-closed date", () => {
    const check = withDate({ transactionDate: "2023-12-31", bookCloseDate: "2023-12-31" });
    expect(check.problems).toEqual([]);
    expect(check.warnings).toHaveLength(1);
    expect(check.warnings[0]).toContain("2023-12-31");
  });

  it("warns when the transaction is before the books-closed date", () => {
    expect(withDate({ transactionDate: "2023-06-01", bookCloseDate: "2023-12-31" }).warnings).toHaveLength(1);
  });

  it("does not warn the day after the books-closed date", () => {
    expect(withDate({ transactionDate: "2024-01-01", bookCloseDate: "2023-12-31" }).warnings).toEqual([]);
  });

  it("does not warn when no books-closed date is set", () => {
    expect(withDate({ transactionDate: "2001-01-01", bookCloseDate: null }).warnings).toEqual([]);
  });

  it("compares the transaction date, not the posted date", () => {
    const check = withDate({
      transactionDate: "2024-01-02",
      postedDate: "2023-12-30",
      bookCloseDate: "2023-12-31",
    });
    expect(check.warnings).toEqual([]);
  });
});
