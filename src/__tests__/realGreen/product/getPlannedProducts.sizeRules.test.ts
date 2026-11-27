import { describe, it, expect } from "vitest";
import { getPlannedProducts } from "@/app/realGreen/product/_lib/selectors/getPlannedProducts";
import {
  SERV_ID,
  masterMap,
  rule,
} from "@/__tests__/realGreen/product/plannedProductTestHelpers";

describe("getPlannedProducts: which rules match the size", () => {
  it("returns no rows when the servCode has no rules", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [],
      productMasterDocMap: masterMap([[1, [{ subId: 11, storedRate: 2 }]]]),
    });

    expect(result).toEqual([]);
  });

  it("always matches an 'all' rule", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [rule("all", 0, [1])],
      productMasterDocMap: masterMap([[1, [{ subId: 11, storedRate: 2 }]]]),
    });

    expect(result).toHaveLength(1);
  });

  describe("lte rule (size <= rule.size)", () => {
    const productMasterDocMap = masterMap([[1, [{ subId: 11, storedRate: 2 }]]]);
    const productRuleDocs = [rule("lte", 10, [1])];

    it("matches when size is smaller than the rule size", () => {
      const result = getPlannedProducts({
        servId: SERV_ID,
        size: 8,
        productRuleDocs,
        productMasterDocMap,
      });

      expect(result).toEqual([
        { productId: 11, servId: SERV_ID, amount: 16, treated: 8 },
      ]);
    });

    it("matches when size equals the rule size", () => {
      const result = getPlannedProducts({
        servId: SERV_ID,
        size: 10,
        productRuleDocs,
        productMasterDocMap,
      });

      expect(result).toHaveLength(1);
    });

    it("does not match when size is larger than the rule size", () => {
      const result = getPlannedProducts({
        servId: SERV_ID,
        size: 12,
        productRuleDocs,
        productMasterDocMap,
      });

      expect(result).toEqual([]);
    });
  });

  describe("gt rule (size > rule.size)", () => {
    const productMasterDocMap = masterMap([[1, [{ subId: 11, storedRate: 2 }]]]);
    const productRuleDocs = [rule("gt", 10, [1])];

    it("does not match when size equals the rule size", () => {
      const result = getPlannedProducts({
        servId: SERV_ID,
        size: 10,
        productRuleDocs,
        productMasterDocMap,
      });

      expect(result).toEqual([]);
    });

    it("matches when size is larger than the rule size", () => {
      const result = getPlannedProducts({
        servId: SERV_ID,
        size: 12,
        productRuleDocs,
        productMasterDocMap,
      });

      expect(result).toEqual([
        { productId: 11, servId: SERV_ID, amount: 24, treated: 12 },
      ]);
    });
  });

  it("counts only the masters of the rules that match the size", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 12,
      productRuleDocs: [rule("lte", 10, [1]), rule("gt", 10, [2])],
      productMasterDocMap: masterMap([
        [1, [{ subId: 11, storedRate: 2 }]],
        [2, [{ subId: 21, storedRate: 3 }]],
      ]),
    });

    expect(result).toEqual([
      { productId: 21, servId: SERV_ID, amount: 36, treated: 12 },
    ]);
  });
});
