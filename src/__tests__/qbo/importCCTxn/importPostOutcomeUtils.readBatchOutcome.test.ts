import { describe, expect, it } from "vitest";
import { readBatchOutcome } from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";
import { QboBatchResponse } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { makePurchase } from "@/__tests__/qbo/purchase/purchaseTestHelpers";
import { makeFault } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

type PurchaseBatch = QboBatchResponse<{ Purchase: QboPurchase }>;

describe("readBatchOutcome", () => {
  it("marks the row posted and keeps the QuickBooks Id when the item carries a Purchase", () => {
    const response: PurchaseBatch = {
      BatchItemResponse: [{ bId: "row-1", Purchase: makePurchase({ Id: "26011" }) }],
    };
    expect(readBatchOutcome({ response, bId: "row-1" })).toEqual({
      outcome: "posted",
      purchaseId: "26011",
      message: "Posted to QuickBooks.",
    });
  });

  it("matches the item by bId, whatever order the items come back in", () => {
    const response: PurchaseBatch = {
      BatchItemResponse: [
        { bId: "row-2", Fault: makeFault({ code: "6000" }) },
        { bId: "row-1", Purchase: makePurchase({ Id: "26011" }) },
      ],
    };
    expect(readBatchOutcome({ response, bId: "row-1" }).outcome).toBe("posted");
    expect(readBatchOutcome({ response, bId: "row-2" }).outcome).toBe("failed");
  });

  it("is unknown when QuickBooks does not answer for the row", () => {
    const response: PurchaseBatch = {
      BatchItemResponse: [{ bId: "row-2", Purchase: makePurchase() }],
    };
    const decision = readBatchOutcome({ response, bId: "row-1" });
    expect(decision.outcome).toBe("unknown");
    expect(decision.purchaseId).toBeNull();
  });

  it("is unknown when the response has no BatchItemResponse at all", () => {
    const response = {} as PurchaseBatch;
    expect(readBatchOutcome({ response, bId: "row-1" }).outcome).toBe("unknown");
  });

  it("reads a fault item through the fault rules", () => {
    const response: PurchaseBatch = {
      BatchItemResponse: [{ bId: "row-1", Fault: makeFault({ code: "6210" }) }],
    };
    expect(readBatchOutcome({ response, bId: "row-1" }).outcome).toBe("pending");
  });

  it("is unknown when a Purchase comes back without an Id, naming the keys it saw", () => {
    const response = {
      BatchItemResponse: [{ bId: "row-1", Purchase: {} }],
    } as unknown as PurchaseBatch;
    const decision = readBatchOutcome({ response, bId: "row-1" });
    expect(decision.outcome).toBe("unknown");
    expect(decision.message).toContain("keys: Purchase");
  });

  it("is unknown, never posted, when the item has an unexpected shape", () => {
    const response = {
      BatchItemResponse: [{ bId: "row-1", Bill: { Id: "9" } }],
    } as unknown as PurchaseBatch;
    const decision = readBatchOutcome({ response, bId: "row-1" });
    expect(decision.outcome).toBe("unknown");
    expect(decision.message).toContain("keys: Bill");
  });

  it("says there were no keys when the item holds only its bId", () => {
    const response = { BatchItemResponse: [{ bId: "row-1" }] } as unknown as PurchaseBatch;
    expect(readBatchOutcome({ response, bId: "row-1" }).message).toContain("keys: none");
  });
});
