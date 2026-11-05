import { describe, expect, it } from "vitest";
import {
  buildBatchItems,
  decisionsFromResponse,
  decisionsFromThrown,
} from "@/app/qbo/importCCTxn/_lib/importBatchRunUtils";
import { QboBatchResponse } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { makePurchase } from "@/__tests__/qbo/purchase/purchaseTestHelpers";
import { makeFault } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

type PurchaseBatch = QboBatchResponse<{ Purchase: QboPurchase }>;

describe("buildBatchItems", () => {
  it("makes one create item per row, with the row id as the bId", () => {
    const purchase = { PaymentType: "CreditCard" } as never;
    const items = buildBatchItems({
      entries: [
        { rowId: "a:1", purchase },
        { rowId: "b:1", purchase },
      ],
    });
    expect(items.map((item) => [item.bId, item.operation])).toEqual([
      ["a:1", "create"],
      ["b:1", "create"],
    ]);
  });

  it("returns no items for no entries", () => {
    expect(buildBatchItems({ entries: [] })).toEqual([]);
  });
});

describe("decisionsFromResponse: partial success", () => {
  it("settles each row by its own answer, whatever order QuickBooks answers in", () => {
    const response: PurchaseBatch = {
      BatchItemResponse: [
        { bId: "c:1", Fault: makeFault({ code: "6000" }) },
        { bId: "a:1", Purchase: makePurchase({ Id: "501" }) },
        { bId: "b:1", Purchase: makePurchase({ Id: "502" }) },
      ],
    };
    const decisions = decisionsFromResponse({ response, rowIds: ["a:1", "b:1", "c:1"] });
    expect(decisions.get("a:1")).toMatchObject({ outcome: "posted", purchaseId: "501" });
    expect(decisions.get("b:1")).toMatchObject({ outcome: "posted", purchaseId: "502" });
    expect(decisions.get("c:1")?.outcome).toBe("failed");
  });

  it("marks a row unknown when QuickBooks leaves it out of the answer, never posted", () => {
    const response: PurchaseBatch = {
      BatchItemResponse: [{ bId: "a:1", Purchase: makePurchase({ Id: "501" }) }],
    };
    const decisions = decisionsFromResponse({ response, rowIds: ["a:1", "b:1"] });
    expect(decisions.get("a:1")?.outcome).toBe("posted");
    expect(decisions.get("b:1")?.outcome).toBe("unknown");
  });

  it("sends the whole-batch errors back to pending for every row that carries one", () => {
    const response: PurchaseBatch = {
      BatchItemResponse: [
        { bId: "a:1", Fault: makeFault({ code: "6210" }) },
        { bId: "b:1", Fault: makeFault({ code: "6210" }) },
      ],
    };
    const decisions = decisionsFromResponse({ response, rowIds: ["a:1", "b:1"] });
    expect([...decisions.values()].map((decision) => decision.outcome)).toEqual([
      "pending",
      "pending",
    ]);
  });

  it("keeps a decision for every row asked about", () => {
    const decisions = decisionsFromResponse({
      response: { BatchItemResponse: [] },
      rowIds: ["a:1", "b:1", "c:1"],
    });
    expect(decisions.size).toBe(3);
  });
});

describe("decisionsFromThrown: a request that died", () => {
  const rowIds = ["a:1", "b:1", "c:1"];

  it("marks every row unknown after a network error, because the batch may have landed", () => {
    const decisions = decisionsFromThrown({
      rowIds,
      thrown: { type: "NETWORK_ERROR", statusCode: 0, message: "Failed to connect to QuickBooks" },
    });
    expect([...decisions.values()].every((decision) => decision.outcome === "unknown")).toBe(true);
    expect(decisions.size).toBe(3);
  });

  it("marks every row unknown after a server error", () => {
    const decisions = decisionsFromThrown({
      rowIds,
      thrown: { type: "EXTERNAL_ERROR", statusCode: 503, message: "Service unavailable" },
    });
    expect(decisions.get("b:1")?.outcome).toBe("unknown");
  });

  it("marks every row failed when the whole request was rejected before anything was created", () => {
    const decisions = decisionsFromThrown({
      rowIds,
      thrown: { type: "EXTERNAL_ERROR", statusCode: 400, message: "QuickBooks error: rejected" },
    });
    expect([...decisions.values()].every((decision) => decision.outcome === "failed")).toBe(true);
  });
});
