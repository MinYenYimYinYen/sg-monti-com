import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import {
  splitZeroNetRows,
  transformToQBJournalCSV,
} from "@/app/javelin/_lib/genLedgerTransform";
import { GenLedgerFile } from "@/app/javelin/JavelinTypes";

function makeFile({ date, rows }: Pick<GenLedgerFile, "date" | "rows">): GenLedgerFile {
  return { fileName: `${date}.csv`, date, rows, warnings: [], errors: [] };
}

function parse(csv: string) {
  return Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data;
}

describe("splitZeroNetRows", () => {
  it("separates exact-zero and float-residue rows from posting rows", () => {
    const { postingRows, zeroNetRows } = splitZeroNetRows([
      { account: "310 - LAWN WEED AND FEED", totalNetAmount: 11047.85 },
      { account: "360 - SALES ADJUSTMENT", totalNetAmount: 0 },
      { account: "361 - FLOAT RESIDUE", totalNetAmount: 97.3 + -97.3 + (0.1 + 0.2 - 0.3) },
      { account: "349 - DISCOUNT", totalNetAmount: -393.42 },
    ]);

    expect(postingRows.map((r) => r.account)).toEqual([
      "310 - LAWN WEED AND FEED",
      "349 - DISCOUNT",
    ]);
    expect(zeroNetRows.map((r) => r.account)).toEqual([
      "360 - SALES ADJUSTMENT",
      "361 - FLOAT RESIDUE",
    ]);
  });
});

describe("transformToQBJournalCSV", () => {
  const accountMap = {};

  it("omits zero-net rows and keeps debits and credits on the correct side", () => {
    const csv = transformToQBJournalCSV(
      [
        makeFile({
          date: "2026-10-21",
          rows: [
            { account: "310 - LAWN WEED AND FEED", totalNetAmount: 100.5 },
            { account: "360 - SALES ADJUSTMENT", totalNetAmount: 0 },
            { account: "349 - DISCOUNT", totalNetAmount: -100.5 },
          ],
        }),
      ],
      accountMap,
      "SAGL 261027-",
    );

    const rows = parse(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]["*Debits"]).toBe("100.5");
    expect(rows[0]["*Credits"]).toBe("");
    expect(rows[1]["*Debits"]).toBe("");
    expect(rows[1]["*Credits"]).toBe("100.5");
    expect(csv).not.toContain("360");
  });

  it("rounds amounts to cents", () => {
    const csv = transformToQBJournalCSV(
      [
        makeFile({
          date: "2026-10-21",
          rows: [{ account: "310 - A", totalNetAmount: 0.1 + 0.2 }],
        }),
      ],
      accountMap,
      "P-",
    );

    expect(parse(csv)[0]["*Debits"]).toBe("0.3");
  });

  it("drops files that net to nothing and keeps journal numbers sequential", () => {
    const csv = transformToQBJournalCSV(
      [
        makeFile({ date: "2026-10-20", rows: [{ account: "360 - A", totalNetAmount: 0 }] }),
        makeFile({ date: "2026-10-21", rows: [{ account: "310 - B", totalNetAmount: 5 }] }),
      ],
      accountMap,
      "P-",
    );

    const rows = parse(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]["*JournalNo"]).toBe("P-01");
    expect(rows[0]["*JournalDate"]).toBe("10/21/2026");
  });
});
