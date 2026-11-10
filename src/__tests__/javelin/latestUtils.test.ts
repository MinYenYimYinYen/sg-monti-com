import { describe, expect, it } from "vitest";
import { describeLatest, nextIsoDate } from "@/app/javelin/_lib/latestUtils";
import { JavelinLatest } from "@/app/javelin/JavelinTypes";

const empty: JavelinLatest = {
  genLedger: null,
  deposit: null,
  ckDeposit: null,
  unsettledDocNumbers: [],
};

describe("nextIsoDate", () => {
  it("rolls over month and year ends without a time zone shift", () => {
    expect(nextIsoDate("2026-10-31")).toBe("2026-11-01");
    expect(nextIsoDate("2026-12-31")).toBe("2027-01-01");
    expect(nextIsoDate("2028-02-28")).toBe("2028-02-29");
  });
});

describe("describeLatest", () => {
  it("says nothing was posted yet", () => {
    expect(describeLatest({ kind: "genLedger", latest: empty })).toContain("No general ledger");
    expect(describeLatest({ kind: "deposit", latest: empty })).toContain("No credit card deposit");
  });

  it("names the last general ledger date and the day to export from next", () => {
    const text = describeLatest({
      kind: "genLedger",
      latest: { ...empty, genLedger: { txnDate: "2026-11-06", docNumber: "SJa-1" } },
    });
    expect(text).toContain("2026-11-06");
    expect(text).toContain("2026-11-07");
  });

  it("gives the date and net amount of the last deposit", () => {
    const text = describeLatest({
      kind: "deposit",
      latest: { ...empty, deposit: { txnDate: "2026-06-02", docNumber: "SJb-1", netDepositCents: 369911 } },
    });
    expect(text).toContain("2026-06-02");
    expect(text).toContain("$3,699.11");
  });
});
