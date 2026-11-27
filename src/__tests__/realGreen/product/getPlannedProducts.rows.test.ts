import { describe, it, expect } from "vitest";
import { getPlannedProducts } from "@/app/realGreen/product/_lib/selectors/getPlannedProducts";
import {
  SERV_ID,
  masterMap,
  rule,
} from "@/__tests__/realGreen/product/plannedProductTestHelpers";

describe("getPlannedProducts: the rows a matching rule gives", () => {
  it("gives one row per sub-product: amount = size * storedRate, treated = size", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [rule("all", 0, [1])],
      productMasterDocMap: masterMap([
        [
          1,
          [
            { subId: 11, storedRate: 2 },
            { subId: 12, storedRate: 0.5 },
          ],
        ],
      ]),
    });

    expect(result).toEqual([
      { productId: 11, servId: SERV_ID, amount: 20, treated: 10 },
      { productId: 12, servId: SERV_ID, amount: 5, treated: 10 },
    ]);
  });

  // Kept from the old behaviour on purpose: nothing de-duplicates a master listed twice.
  it("counts a master twice when it is on two matching rules", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [rule("all", 0, [1]), rule("lte", 10, [1])],
      productMasterDocMap: masterMap([[1, [{ subId: 11, storedRate: 2 }]]]),
    });

    expect(result).toEqual([
      { productId: 11, servId: SERV_ID, amount: 20, treated: 10 },
      { productId: 11, servId: SERV_ID, amount: 20, treated: 10 },
    ]);
  });

  it("skips a master id with no master doc and still counts the other masters", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [rule("all", 0, [99, 1])],
      productMasterDocMap: masterMap([[1, [{ subId: 11, storedRate: 2 }]]]),
    });

    expect(result).toEqual([
      { productId: 11, servId: SERV_ID, amount: 20, treated: 10 },
    ]);
  });

  it("gives no rows for a master with no sub-products", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [rule("all", 0, [1])],
      productMasterDocMap: masterMap([[1, []]]),
    });

    expect(result).toEqual([]);
  });

  it("gives one row per master when two masters share a sub-product (the caller groups them)", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [rule("all", 0, [1, 2])],
      productMasterDocMap: masterMap([
        [1, [{ subId: 11, storedRate: 2 }]],
        [2, [{ subId: 11, storedRate: 0.5 }]],
      ]),
    });

    expect(result).toEqual([
      { productId: 11, servId: SERV_ID, amount: 20, treated: 10 },
      { productId: 11, servId: SERV_ID, amount: 5, treated: 10 },
    ]);
  });

  it("orders rows by rule, then master as listed on the rule, then sub-product as listed on the master", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 10,
      productRuleDocs: [rule("all", 0, [2, 1]), rule("all", 0, [3])],
      productMasterDocMap: masterMap([
        [
          1,
          [
            { subId: 11, storedRate: 1 },
            { subId: 12, storedRate: 1 },
          ],
        ],
        [2, [{ subId: 21, storedRate: 1 }]],
        [3, [{ subId: 31, storedRate: 1 }]],
      ]),
    });

    expect(result.map((row) => row.productId)).toEqual([21, 11, 12, 31]);
  });

  it("gives rows with zero amount and zero treated when size is 0", () => {
    const result = getPlannedProducts({
      servId: SERV_ID,
      size: 0,
      productRuleDocs: [rule("all", 0, [1])],
      productMasterDocMap: masterMap([[1, [{ subId: 11, storedRate: 2 }]]]),
    });

    expect(result).toEqual([
      { productId: 11, servId: SERV_ID, amount: 0, treated: 0 },
    ]);
  });
});
