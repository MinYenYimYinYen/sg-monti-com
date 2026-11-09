import { describe, expect, it } from "vitest";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";
import {
  planDepositMigration,
  planGenLedgerMigration,
} from "@/app/javelin/migration/migrationUtils";

function makeAccount(overrides: Partial<QboAccount> & Pick<QboAccount, "Id" | "FullyQualifiedName">): QboAccount {
  return {
    Name: overrides.FullyQualifiedName,
    SyncToken: "0",
    Active: true,
    AccountType: "Income",
    AccountSubType: "SalesOfProductIncome",
    SubAccount: false,
    ...overrides,
  };
}

const customer: QboCustomerSummary = {
  Id: "900",
  DisplayName: "CRM Receivables",
  FullyQualifiedName: "CRM Receivables",
  Active: true,
  Job: false,
  CompanyName: null,
};

const lookups = {
  accounts: [
    makeAccount({ Id: "1", FullyQualifiedName: "SA Payments:Credit Card Payments", AcctNum: "102.2" }),
    makeAccount({ Id: "2", FullyQualifiedName: "Accounts Receivable", AccountType: "Accounts Receivable", AcctNum: "110" }),
    makeAccount({ Id: "3", FullyQualifiedName: "Fees", AcctNum: "600" }),
    makeAccount({ Id: "4", FullyQualifiedName: "Fees", AcctNum: "601" }),
  ],
  customers: [customer],
  vendors: [],
};

describe("planGenLedgerMigration", () => {
  it("links by the QuickBooks name and files it under the number in the CRM name", () => {
    const [line] = planGenLedgerMigration({
      legacyMap: { "102.2 - CC PAYMENTS": { qbName: "SA Payments:Credit Card Payments" } },
      existingRgAccountIds: new Set(),
      lookups,
    });
    expect(line).toMatchObject({ status: "create", targetKey: "102.2", qboAccountId: "1" });
  });

  it("never overwrites a link that already exists", () => {
    const [line] = planGenLedgerMigration({
      legacyMap: { "102.2 - CC PAYMENTS": { qbName: "SA Payments:Credit Card Payments" } },
      existingRgAccountIds: new Set(["102.2"]),
      lookups,
    });
    expect(line.status).toBe("alreadyMapped");
  });

  it("resolves the default customer on a receivable account", () => {
    const [line] = planGenLedgerMigration({
      legacyMap: { "110 - A/R": { qbName: "Accounts Receivable", name: "CRM Receivables" } },
      existingRgAccountIds: new Set(),
      lookups,
    });
    expect(line).toMatchObject({ status: "create", defaultNameType: "Customer", defaultNameId: "900" });
  });

  it("does not guess when two accounts share a name", () => {
    const [line] = planGenLedgerMigration({
      legacyMap: { "999 - FEES": { qbName: "Fees" } },
      existingRgAccountIds: new Set(),
      lookups,
    });
    expect(line.status).toBe("unmatched");
    expect(line.note).toContain("More than one");
  });

  it("falls back to the account number when the name does not match", () => {
    const [line] = planGenLedgerMigration({
      legacyMap: { "600 - FEES": { qbName: "Old Fees Name" } },
      existingRgAccountIds: new Set(),
      lookups,
    });
    expect(line).toMatchObject({ status: "create", qboAccountId: "3" });
  });

  it("flags two CRM accounts that share a number but disagree", () => {
    const lines = planGenLedgerMigration({
      legacyMap: {
        "102.2 - A": { qbName: "SA Payments:Credit Card Payments" },
        "102.2 - B": { qbName: "Accounts Receivable" },
      },
      existingRgAccountIds: new Set(),
      lookups,
    });
    expect(lines.map((line) => line.status)).toEqual(["conflict", "conflict"]);
  });

  it("skips entries that never had a QuickBooks name", () => {
    expect(
      planGenLedgerMigration({
        legacyMap: { "1 - X": { qbName: "" } },
        existingRgAccountIds: new Set(),
        lookups,
      }),
    ).toEqual([]);
  });
});

describe("planDepositMigration", () => {
  it("matches a deposit field by name", () => {
    const [line] = planDepositMigration({
      legacyMap: { fees: { qbName: "Accounts Receivable" } },
      existingFields: new Set(),
      lookups,
    });
    expect(line).toMatchObject({ status: "create", targetKey: "fees", qboAccountId: "2" });
  });

  it("leaves an existing field link alone", () => {
    const [line] = planDepositMigration({
      legacyMap: { fees: { qbName: "Accounts Receivable" } },
      existingFields: new Set(["fees"]),
      lookups,
    });
    expect(line.status).toBe("alreadyMapped");
  });
});
