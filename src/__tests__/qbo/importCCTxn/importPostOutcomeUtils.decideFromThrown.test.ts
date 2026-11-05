import { describe, expect, it } from "vitest";
import { decideFromThrown } from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";

function decide({ type, statusCode }: { type: string; statusCode: number }) {
  return decideFromThrown({ type, statusCode, message: "QuickBooks error: rejected" });
}

describe("decideFromThrown", () => {
  it("is unknown for a network error, because the request may have been saved before it died", () => {
    const decision = decideFromThrown({
      type: "NETWORK_ERROR",
      statusCode: 0,
      message: "Failed to connect to QuickBooks",
    });
    expect(decision.outcome).toBe("unknown");
    expect(decision.purchaseId).toBeNull();
    expect(decision.message).toContain("Failed to connect to QuickBooks");
    expect(decision.message).toContain("Check QuickBooks before posting again");
  });

  it.each([500, 502, 503, 504])("is unknown for a %i from QuickBooks", (statusCode) => {
    expect(decide({ type: "EXTERNAL_ERROR", statusCode }).outcome).toBe("unknown");
  });

  it("is unknown for an unexpected exception, which defaults to a 500", () => {
    expect(decide({ type: "UNKNOWN_ERROR", statusCode: 500 }).outcome).toBe("unknown");
  });

  it("treats 500 as the first server status and 499 as the last client one", () => {
    expect(decide({ type: "EXTERNAL_ERROR", statusCode: 499 }).outcome).toBe("failed");
    expect(decide({ type: "EXTERNAL_ERROR", statusCode: 500 }).outcome).toBe("unknown");
  });

  it.each([400, 401, 403, 429])(
    "is failed for a %i, which QuickBooks rejected before creating anything",
    (statusCode) => {
      const decision = decide({ type: "EXTERNAL_ERROR", statusCode });
      expect(decision.outcome).toBe("failed");
      expect(decision.message).toBe("QuickBooks error: rejected");
    },
  );

  it("is failed for our own validation errors", () => {
    expect(decide({ type: "VALIDATION_ERROR", statusCode: 400 }).outcome).toBe("failed");
  });

  it("lets a network error win over a client-looking status code", () => {
    expect(decide({ type: "NETWORK_ERROR", statusCode: 400 }).outcome).toBe("unknown");
  });
});
