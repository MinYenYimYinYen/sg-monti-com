import { describe, it, expect } from "vitest";
import { findRevenueGroupProblems } from "@/app/salesTax/_lib/findRevenueGroupProblems";
import {
  makeMnTaxLineFor,
  makeRevenueGroupOf,
} from "@/__tests__/salesTax/revenueGroupTestHelpers";

// Metro housing (392) and metro transportation (394) are the pair the state requires to match.
describe("findRevenueGroupProblems", () => {
  it("returns nothing when every line has the same customers and revenue", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [101, 102], netAfterAllDiscounts: 300 }),
        makeMnTaxLineFor({ code: "394", custIds: [101, 102], netAfterAllDiscounts: 300 }),
      ],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394"] })],
    });

    expect(problems).toEqual([]);
  });

  it("names a customer who is on one line of the group but not the other", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [101, 102], netAfterAllDiscounts: 300 }),
        makeMnTaxLineFor({ code: "394", custIds: [101], netAfterAllDiscounts: 100 }),
      ],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394"] })],
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]!.customerGaps).toEqual([
      { custId: 102, onMnTaxCodes: ["392"], missingFromMnTaxCodes: ["394"] },
    ]);
  });

  it("reports each line's revenue and customer count", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [101, 102], netAfterAllDiscounts: 300 }),
        makeMnTaxLineFor({ code: "394", custIds: [101], netAfterAllDiscounts: 100 }),
      ],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394"] })],
    });

    expect(problems[0]!.lineTotals).toEqual([
      { mnTaxCode: "392", netAfterAllDiscounts: 300, customerCount: 2 },
      { mnTaxCode: "394", netAfterAllDiscounts: 100, customerCount: 1 },
    ]);
  });

  it("treats a member with no line this month as an empty line, so every customer is a gap", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [makeMnTaxLineFor({ code: "392", custIds: [101], netAfterAllDiscounts: 100 })],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394"] })],
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]!.lineTotals).toEqual([
      { mnTaxCode: "392", netAfterAllDiscounts: 100, customerCount: 1 },
      { mnTaxCode: "394", netAfterAllDiscounts: 0, customerCount: 0 },
    ]);
    expect(problems[0]!.customerGaps).toEqual([
      { custId: 101, onMnTaxCodes: ["392"], missingFromMnTaxCodes: ["394"] },
    ]);
  });

  it("flags a group whose customers match but whose revenue differs, with no customer to blame", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [101], netAfterAllDiscounts: 100 }),
        makeMnTaxLineFor({ code: "394", custIds: [101], netAfterAllDiscounts: 99.99 }),
      ],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394"] })],
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]!.customerGaps).toEqual([]);
  });

  it("treats revenue that differs only by floating point noise as identical", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [101], netAfterAllDiscounts: 0.1 + 0.2 }),
        makeMnTaxLineFor({ code: "394", custIds: [101], netAfterAllDiscounts: 0.3 }),
      ],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394"] })],
    });

    expect(problems).toEqual([]);
  });

  it("ignores a group with a single member, since there is nothing to compare", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [makeMnTaxLineFor({ code: "392", custIds: [101], netAfterAllDiscounts: 100 })],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392"] })],
    });

    expect(problems).toEqual([]);
  });

  it("lists customer gaps in ascending customer id order", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [300, 100, 200], netAfterAllDiscounts: 300 }),
        makeMnTaxLineFor({ code: "394", custIds: [], netAfterAllDiscounts: 0 }),
      ],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394"] })],
    });

    expect(problems[0]!.customerGaps.map((gap) => gap.custId)).toEqual([100, 200, 300]);
  });

  it("names every line a customer is missing from in a group of three", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [101, 102], netAfterAllDiscounts: 200 }),
        makeMnTaxLineFor({ code: "394", custIds: [101], netAfterAllDiscounts: 100 }),
        makeMnTaxLineFor({ code: "396", custIds: [101], netAfterAllDiscounts: 100 }),
      ],
      groups: [makeRevenueGroupOf({ revenueGroupKey: "g1", mnTaxCodes: ["392", "394", "396"] })],
    });

    expect(problems[0]!.customerGaps).toEqual([
      { custId: 102, onMnTaxCodes: ["392"], missingFromMnTaxCodes: ["394", "396"] },
    ]);
  });

  it("checks each group on its own and reports only the failing one", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [
        makeMnTaxLineFor({ code: "392", custIds: [101], netAfterAllDiscounts: 100 }),
        makeMnTaxLineFor({ code: "394", custIds: [101], netAfterAllDiscounts: 100 }),
        makeMnTaxLineFor({ code: "396", custIds: [201], netAfterAllDiscounts: 50 }),
        makeMnTaxLineFor({ code: "398", custIds: [], netAfterAllDiscounts: 0 }),
      ],
      groups: [
        makeRevenueGroupOf({ revenueGroupKey: "passing", mnTaxCodes: ["392", "394"] }),
        makeRevenueGroupOf({ revenueGroupKey: "failing", mnTaxCodes: ["396", "398"] }),
      ],
    });

    expect(problems.map((problem) => problem.revenueGroupKey)).toEqual(["failing"]);
    expect(problems[0]!.mnTaxCodes).toEqual(["396", "398"]);
  });

  it("returns nothing when there are no groups", () => {
    const problems = findRevenueGroupProblems({
      mnTaxLines: [makeMnTaxLineFor({ code: "392", custIds: [101], netAfterAllDiscounts: 100 })],
      groups: [],
    });

    expect(problems).toEqual([]);
  });
});
