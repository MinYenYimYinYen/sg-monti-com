import { describe, expect, it } from "vitest";
import {
  accountIdsUsedForMerchant,
  chooseOverrideAccountId,
  describeOtherAccounts,
  flagsDefaultAccount,
  resolveRowAccountId,
  shouldRememberAccount,
} from "@/app/qbo/importCCTxn/_lib/importAccountUtils";
import { makeExpenseAccount, makeMapping } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

describe("resolveRowAccountId", () => {
  it("uses the merchant's default when the row has no choice", () => {
    const mapping = makeMapping({ defaultAccountId: "13" });
    expect(resolveRowAccountId({ rowAccountId: undefined, mapping })).toBe("13");
  });

  it("uses the row's own account over the merchant's default, which is what gets posted", () => {
    const mapping = makeMapping({ defaultAccountId: "13" });
    expect(resolveRowAccountId({ rowAccountId: "99", mapping })).toBe("99");
  });

  it("is null when there is no mapping and no choice", () => {
    expect(resolveRowAccountId({ rowAccountId: undefined, mapping: null })).toBeNull();
  });

  it("keeps the row's choice even when the merchant has no mapping", () => {
    expect(resolveRowAccountId({ rowAccountId: "99", mapping: null })).toBe("99");
  });

  it("treats an empty string as no choice", () => {
    const mapping = makeMapping({ defaultAccountId: "13" });
    expect(resolveRowAccountId({ rowAccountId: "", mapping })).toBe("13");
  });
});

describe("chooseOverrideAccountId", () => {
  const mapping = makeMapping({ defaultAccountId: "13" });

  it("stores the chosen account when it differs from the default", () => {
    expect(chooseOverrideAccountId({ selectedAccountId: "99", mapping })).toBe("99");
  });

  it("clears the row's choice when the default is picked again", () => {
    expect(chooseOverrideAccountId({ selectedAccountId: "13", mapping })).toBeNull();
  });
});

describe("flagsDefaultAccount", () => {
  it("flags a default that was filled in when the merchant has other accounts", () => {
    const mapping = makeMapping({ otherAccountIds: ["20"] });
    expect(flagsDefaultAccount({ mapping, rowAccountId: undefined })).toBe(true);
  });

  it("does not flag a merchant that has only ever used one account", () => {
    const mapping = makeMapping({ otherAccountIds: [] });
    expect(flagsDefaultAccount({ mapping, rowAccountId: undefined })).toBe(false);
  });

  it("does not flag a row whose account a person already chose", () => {
    const mapping = makeMapping({ otherAccountIds: ["20"] });
    expect(flagsDefaultAccount({ mapping, rowAccountId: "20" })).toBe(false);
  });

  it("does not flag when there is no mapping", () => {
    expect(flagsDefaultAccount({ mapping: null, rowAccountId: undefined })).toBe(false);
  });
});

describe("shouldRememberAccount", () => {
  const mapping = makeMapping({ defaultAccountId: "13", otherAccountIds: ["20"] });

  it("remembers an account the merchant has not used before", () => {
    expect(shouldRememberAccount({ mapping, postedAccountId: "99" })).toBe(true);
  });

  it("does not remember the default, which is already the merchant's account", () => {
    expect(shouldRememberAccount({ mapping, postedAccountId: "13" })).toBe(false);
  });

  it("does not remember an account that is already listed", () => {
    expect(shouldRememberAccount({ mapping, postedAccountId: "20" })).toBe(false);
  });

  it("does not remember anything without a mapping", () => {
    expect(shouldRememberAccount({ mapping: null, postedAccountId: "99" })).toBe(false);
  });
});

describe("accountIdsUsedForMerchant", () => {
  it("holds the default and the other accounts", () => {
    const mapping = makeMapping({ defaultAccountId: "13", otherAccountIds: ["20", "21"] });
    expect([...accountIdsUsedForMerchant(mapping)].sort()).toEqual(["13", "20", "21"]);
  });

  it("holds just the default when there are no other accounts", () => {
    const mapping = makeMapping({ defaultAccountId: "13", otherAccountIds: [] });
    expect([...accountIdsUsedForMerchant(mapping)]).toEqual(["13"]);
  });
});

describe("describeOtherAccounts", () => {
  const accountMap = new Map([
    ["20", makeExpenseAccount({ Id: "20", FullyQualifiedName: "Supplies:Office" })],
    ["21", makeExpenseAccount({ Id: "21", FullyQualifiedName: "Travel" })],
  ]);

  it("names each other account", () => {
    const mapping = makeMapping({ otherAccountIds: ["20", "21"] });
    expect(describeOtherAccounts({ mapping, accountMap })).toEqual(["Supplies:Office", "Travel"]);
  });

  it("shows an account QuickBooks no longer lists by its id", () => {
    const mapping = makeMapping({ otherAccountIds: ["20", "777"] });
    expect(describeOtherAccounts({ mapping, accountMap })).toEqual([
      "Supplies:Office",
      "Account 777",
    ]);
  });

  it("is empty when there are none, or no mapping", () => {
    expect(describeOtherAccounts({ mapping: makeMapping(), accountMap })).toEqual([]);
    expect(describeOtherAccounts({ mapping: null, accountMap })).toEqual([]);
  });
});
