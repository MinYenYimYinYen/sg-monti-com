import { describe, expect, it } from "vitest";
import { decideFromFault } from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";
import { QboFault } from "@/app/qbo/_lib/types/QboCommonTypes";
import { makeFault } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

// The danger these rules guard against is a wrong "failed": a failed row can be posted again, and
// a purchase that did land would then be entered twice. So anything not certain must be "unknown".

describe("decideFromFault", () => {
  it.each(["610", "2500", "6240", "6140", "2020", "6000"])(
    "marks a row failed for the per-row error %s, so it stays editable and retryable",
    (code) => {
      const decision = decideFromFault(makeFault({ code }));
      expect(decision.outcome).toBe("failed");
      expect(decision.purchaseId).toBeNull();
    },
  );

  it.each(["6210", "6190", "120"])(
    "sends the row back to pending for the whole-batch error %s",
    (code) => {
      const decision = decideFromFault(makeFault({ code }));
      expect(decision.outcome).toBe("pending");
      expect(decision.purchaseId).toBeNull();
      expect(decision.message).toContain("Nothing was posted");
    },
  );

  it("recognizes a whole-batch code that arrives as a number, as JSON can deliver it", () => {
    const fault = {
      type: "ValidationFault",
      Error: [{ Message: "Authorization failure", code: 120 as unknown as string }],
    } satisfies QboFault;
    expect(decideFromFault(fault).outcome).toBe("pending");
  });

  it("stops the batch when any one of several errors is a whole-batch code", () => {
    const fault: QboFault = {
      type: "ValidationFault",
      Error: [
        { Message: "Business Validation Error", code: "6000" },
        { Message: "Account period closed", code: "6210" },
      ],
    };
    expect(decideFromFault(fault).outcome).toBe("pending");
  });

  it("puts the message, the detail and every code in the text shown to the user", () => {
    const decision = decideFromFault(
      makeFault({
        code: "6240",
        message: "Duplicate Name Exists Error",
        detail: "The name supplied already exists.",
      }),
    );
    expect(decision.message).toBe(
      "Duplicate Name Exists Error: The name supplied already exists. (code 6240)",
    );
  });

  it("falls back to a generic message when the fault carries no errors", () => {
    const decision = decideFromFault({ type: "ValidationFault" });
    expect(decision.outcome).toBe("failed");
    expect(decision.message).toBe("QuickBooks rejected the purchase.");
  });
});
