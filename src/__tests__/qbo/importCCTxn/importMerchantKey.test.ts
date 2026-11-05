import { describe, expect, it } from "vitest";
import {
  buildMerchantKey,
  collapseDescription,
  findRowsNeedingNewKey,
} from "@/app/qbo/importCCTxn/_lib/importMerchantKey";

// The key groups one merchant's descriptions into a family. When unsure it must split, never
// merge: a wrong merge puts the wrong vendor on a row, a wrong split only costs one extra click.

describe("collapseDescription", () => {
  it("uppercases, trims and collapses whitespace, and keeps every other character", () => {
    expect(collapseDescription("  Amazon   Mktpl*VQ0ST9ZQ3 ")).toBe("AMAZON MKTPL*VQ0ST9ZQ3");
  });

  it("turns a tab or line break into a space", () => {
    expect(collapseDescription("A\tB\nC")).toBe("A B C");
  });
});

describe("buildMerchantKey: one family per merchant", () => {
  it("drops an order code after a star, so every order of a marketplace is one family", () => {
    expect(buildMerchantKey("AMAZON MKTPL*VQ0ST9ZQ3")).toBe("AMAZON MKTPL");
    expect(buildMerchantKey("AMAZON MKTPL*5E32X8HH1")).toBe("AMAZON MKTPL");
    expect(buildMerchantKey("Amazon.com*BL82J1O73")).toBe("AMAZON.COM");
  });

  it("drops a store number after a hash, so every store of a chain is one family", () => {
    expect(buildMerchantKey("HARDWARE DEPOT #109")).toBe("HARDWARE DEPOT");
    expect(buildMerchantKey("HARDWARE DEPOT #458")).toBe("HARDWARE DEPOT");
    expect(buildMerchantKey("CIRCLEK #2746238")).toBe("CIRCLEK");
  });

  it("drops a letter-dash-digits store code", () => {
    expect(buildMerchantKey("TARGET T-2180")).toBe("TARGET");
  });

  it("drops a trailing number of three or more digits", () => {
    expect(buildMerchantKey("FUEL STOP 3715")).toBe("FUEL STOP");
  });

  it("leaves a description with nothing to drop unchanged", () => {
    expect(buildMerchantKey("ANTHROPIC")).toBe("ANTHROPIC");
    expect(buildMerchantKey("AMERICANEAGLECOM")).toBe("AMERICANEAGLECOM");
  });

  it("ignores case and spacing, so the same merchant written two ways is one family", () => {
    expect(buildMerchantKey("Adobe")).toBe("ADOBE");
    expect(buildMerchantKey("  adobe  ")).toBe("ADOBE");
  });

  it("gives the same key for the same description every time", () => {
    expect(buildMerchantKey("HARDWARE DEPOT #109")).toBe(buildMerchantKey("HARDWARE DEPOT #109"));
  });
});

describe("buildMerchantKey: stays split when unsure", () => {
  it("keeps plain words after a star, so processor prefixes never merge different merchants", () => {
    expect(buildMerchantKey("SQ *JOES PIZZA")).toBe("SQ *JOES PIZZA");
    expect(buildMerchantKey("SQ *BLUE BOTTLE COFFEE")).toBe("SQ *BLUE BOTTLE COFFEE");
    expect(buildMerchantKey("PAYPAL *DOGTOYS")).toBe("PAYPAL *DOGTOYS");
    expect(buildMerchantKey("UBER *EATS")).toBe("UBER *EATS");
    expect(buildMerchantKey("UBER *TRIP")).toBe("UBER *TRIP");
  });

  it("keeps a multi-word tail after a star, dropping only a trailing store number", () => {
    // The star rule leaves the tail alone because it is not one code. The store-number rule
    // then drops the 1234, so the merchant name stays and other merchants never merge into it.
    expect(buildMerchantKey("SQ *BLUE BOTTLE 1234")).toBe("SQ *BLUE BOTTLE");
    expect(buildMerchantKey("SQ *BLUE BOTTLE 1234")).not.toBe(buildMerchantKey("SQ *JOES PIZZA"));
  });

  it("keeps a lone digit that is part of a name", () => {
    expect(buildMerchantKey("MOTEL 6")).toBe("MOTEL 6");
    expect(buildMerchantKey("MOTEL 6 #1234")).toBe("MOTEL 6");
  });

  it("keeps a two-digit number, which may be part of the name", () => {
    expect(buildMerchantKey("ROUTE 66 DINER")).toBe("ROUTE 66 DINER");
    expect(buildMerchantKey("CLUB 24")).toBe("CLUB 24");
  });

  it("keeps punctuation and trailing words, which are stable from month to month", () => {
    expect(buildMerchantKey("VENDOR INC.")).toBe("VENDOR INC.");
    expect(buildMerchantKey("T C N, INC")).toBe("T C N, INC");
    expect(buildMerchantKey("SERVICE - TOWN")).toBe("SERVICE - TOWN");
  });

  it("keeps a star with nothing after it", () => {
    expect(buildMerchantKey("STORE*")).toBe("STORE*");
  });

  it("does not turn two different descriptions into one family", () => {
    const keys = ["SQ *JOES PIZZA", "SQ *BLUE BOTTLE COFFEE", "UBER *EATS", "UBER *TRIP", "MOTEL 6"];
    expect(new Set(keys.map(buildMerchantKey)).size).toBe(keys.length);
  });
});

describe("buildMerchantKey: never empty", () => {
  it("falls back to the full description when everything looks like a store number", () => {
    expect(buildMerchantKey("#1234")).toBe("#1234");
    expect(buildMerchantKey("12345")).toBe("12345");
  });

  it("keeps the first word when only the rest looks like a store number", () => {
    expect(buildMerchantKey("SHOP 12345 #7")).toBe("SHOP");
  });

  it("returns an empty string only for an empty description", () => {
    expect(buildMerchantKey("   ")).toBe("");
  });
});

describe("findRowsNeedingNewKey", () => {
  it("lists a row whose stored key differs from what the current rules give", () => {
    const rows = [
      { rowId: "a:1", description: "HARDWARE DEPOT #109", merchantKey: "HARDWARE DEPOT #109" },
    ];
    expect(findRowsNeedingNewKey(rows)).toEqual([{ rowId: "a:1", merchantKey: "HARDWARE DEPOT" }]);
  });

  it("leaves a row whose key is already current", () => {
    const rows = [{ rowId: "a:1", description: "ANTHROPIC", merchantKey: "ANTHROPIC" }];
    expect(findRowsNeedingNewKey(rows)).toEqual([]);
  });

  it("returns an empty list for no rows", () => {
    expect(findRowsNeedingNewKey([])).toEqual([]);
  });
});
