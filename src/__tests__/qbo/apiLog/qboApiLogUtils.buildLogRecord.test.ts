import { describe, expect, it } from "vitest";
import { buildLogRecord, cleanFaultErrors, QboApiLogInput } from "@/app/qbo/apiLog/_lib/qboApiLogUtils";
import { QboFaultError } from "@/app/qbo/_lib/types/QboCommonTypes";

const now = new Date("2026-11-04T12:00:00.000Z");

function makeInput(overrides: Partial<QboApiLogInput> = {}): QboApiLogInput {
  return {
    logId: "log-1",
    operation: "getAll",
    kind: "api",
    method: "GET",
    pathTemplate: "/query",
    realmId: "123456",
    httpStatus: 200,
    intuitTid: "1234-abcd",
    durationMs: 250,
    faultType: null,
    faultErrors: [],
    now,
    ...overrides,
  };
}

function makeFaultError(overrides: Partial<QboFaultError> = {}): QboFaultError {
  return { Message: "Business Validation Error", Detail: "Something is wrong", code: "6000", ...overrides };
}

describe("buildLogRecord", () => {
  it("records a successful call", () => {
    const record = buildLogRecord(makeInput());
    expect(record).toMatchObject({
      logId: "log-1",
      loggedAt: "2026-11-04T12:00:00.000Z",
      operation: "getAll",
      kind: "api",
      method: "GET",
      pathTemplate: "/query",
      realmId: "123456",
      httpStatus: 200,
      outcome: "success",
      intuitTid: "1234-abcd",
      durationMs: 250,
      faultType: null,
      faultErrors: [],
    });
  });

  it("keeps a success 90 days and a failure 365 days", () => {
    const success = buildLogRecord(makeInput());
    const failure = buildLogRecord(makeInput({ httpStatus: 400 }));
    expect(success.expireAt.toISOString()).toBe("2027-02-02T12:00:00.000Z");
    expect(failure.expireAt.toISOString()).toBe("2027-11-04T12:00:00.000Z");
  });

  it("records a network error with no intuit_tid", () => {
    const record = buildLogRecord(makeInput({ httpStatus: 0, intuitTid: null }));
    expect(record.outcome).toBe("networkError");
    expect(record.intuitTid).toBeNull();
  });

  it("records the fault details of a validation error", () => {
    const record = buildLogRecord(
      makeInput({
        httpStatus: 400,
        faultType: "ValidationFault",
        faultErrors: [makeFaultError({ element: "VendorRef" })],
      }),
    );
    expect(record.outcome).toBe("httpError");
    expect(record.faultType).toBe("ValidationFault");
    expect(record.faultErrors).toEqual([
      {
        code: "6000",
        message: "Business Validation Error",
        detail: "Something is wrong",
        element: "VendorRef",
      },
    ]);
  });

  it("rounds the duration and never stores a negative one", () => {
    expect(buildLogRecord(makeInput({ durationMs: 250.6 })).durationMs).toBe(251);
    expect(buildLogRecord(makeInput({ durationMs: -5 })).durationMs).toBe(0);
  });

  it("records an OAuth call with no company and the OAuth error code as the fault type", () => {
    const record = buildLogRecord(
      makeInput({
        kind: "oauthToken",
        method: "POST",
        pathTemplate: "token:refresh_token",
        realmId: null,
        httpStatus: 400,
        faultType: "invalid_grant",
      }),
    );
    expect(record.kind).toBe("oauthToken");
    expect(record.realmId).toBeNull();
    expect(record.faultType).toBe("invalid_grant");
  });

  it("redacts credentials that show up in fault text", () => {
    const record = buildLogRecord(
      makeInput({
        httpStatus: 401,
        faultErrors: [makeFaultError({ Detail: "Rejected Bearer abc.def.ghi for the call" })],
      }),
    );
    expect(record.faultErrors[0]?.detail).not.toContain("abc.def.ghi");
  });

  it("stores only the expected fields, so nothing like a token or header can ride along", () => {
    const record = buildLogRecord(makeInput());
    expect(Object.keys(record).sort()).toEqual(
      [
        "logId",
        "loggedAt",
        "operation",
        "kind",
        "method",
        "pathTemplate",
        "realmId",
        "httpStatus",
        "outcome",
        "intuitTid",
        "durationMs",
        "faultType",
        "faultErrors",
        "expireAt",
      ].sort(),
    );
  });
});

describe("cleanFaultErrors", () => {
  it("keeps at most 5 errors", () => {
    const faultErrors = Array.from({ length: 8 }, (_, index) =>
      makeFaultError({ code: String(index) }),
    );
    expect(cleanFaultErrors(faultErrors)).toHaveLength(5);
  });

  it("cuts long text to 300 characters plus a marker", () => {
    const [cleaned] = cleanFaultErrors([makeFaultError({ Detail: "x ".repeat(400) })]);
    expect(cleaned?.detail).toHaveLength(301);
    expect(cleaned?.detail.endsWith("…")).toBe(true);
  });

  it("fills missing optional fields with empty text", () => {
    const [cleaned] = cleanFaultErrors([{ Message: "Oops", code: "100" }]);
    expect(cleaned).toEqual({ code: "100", message: "Oops", detail: "", element: "" });
  });
});
