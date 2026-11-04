import { describe, expect, it } from "vitest";
import { classifyRefreshFailure, evaluateTokenAccess } from "@/app/qbo/_lib/auth/qboTokenUtils";
import { QboConnectionDoc } from "@/app/qbo/connection/types/QboConnectionTypes";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const now = new Date("2026-11-04T12:00:00.000Z");

function isoFromNow(offsetMs: number): string {
  return new Date(now.getTime() + offsetMs).toISOString();
}

function makeDoc(overrides: Partial<QboConnectionDoc> = {}): QboConnectionDoc {
  return {
    realmId: "9130354609481976",
    environment: "production",
    status: "connected",
    accessTokenEnc: "enc-access",
    refreshTokenEnc: "enc-refresh",
    accessTokenExpiresAt: isoFromNow(50 * MINUTE_MS),
    refreshTokenExpiresAt: isoFromNow(90 * DAY_MS),
    connectedByUserName: "admin",
    connectedAt: isoFromNow(-DAY_MS),
    version: 1,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function evaluate({
  doc,
  mustRefresh = false,
  configuredEnvironment = "production",
}: {
  doc: QboConnectionDoc;
  mustRefresh?: boolean;
  configuredEnvironment?: "sandbox" | "production";
}) {
  return evaluateTokenAccess({ doc, now, configuredEnvironment, mustRefresh });
}

describe("evaluateTokenAccess", () => {
  it("uses the access token when it has plenty of life left", () => {
    expect(evaluate({ doc: makeDoc() })).toEqual({ action: "use" });
  });

  it("refreshes when the access token is within 5 minutes of expiring", () => {
    const doc = makeDoc({ accessTokenExpiresAt: isoFromNow(4 * MINUTE_MS) });
    expect(evaluate({ doc })).toEqual({ action: "refresh" });
  });

  it("still uses the access token just outside the 5 minute margin", () => {
    const doc = makeDoc({ accessTokenExpiresAt: isoFromNow(6 * MINUTE_MS) });
    expect(evaluate({ doc })).toEqual({ action: "use" });
  });

  it("refreshes an access token that has already expired", () => {
    const doc = makeDoc({ accessTokenExpiresAt: isoFromNow(-MINUTE_MS) });
    expect(evaluate({ doc })).toEqual({ action: "refresh" });
  });

  it("refreshes after a 401 even though the access token looks fine", () => {
    expect(evaluate({ doc: makeDoc(), mustRefresh: true })).toEqual({ action: "refresh" });
  });

  it("refreshes when the access token date cannot be read", () => {
    const doc = makeDoc({ accessTokenExpiresAt: "not a date" });
    expect(evaluate({ doc })).toEqual({ action: "refresh" });
  });

  it("fails with reconnectRequired when the stored connection says so", () => {
    const doc = makeDoc({ status: "reconnectRequired", accessTokenEnc: "", refreshTokenEnc: "" });
    expect(evaluate({ doc })).toEqual({ action: "fail", reason: "reconnectRequired" });
  });

  it("fails when the tokens were issued for another environment", () => {
    const doc = makeDoc({ environment: "sandbox" });
    expect(evaluate({ doc, configuredEnvironment: "production" })).toEqual({
      action: "fail",
      reason: "environmentMismatch",
    });
  });

  it("fails when the refresh token has expired, even if the access token needs a refresh", () => {
    const doc = makeDoc({
      accessTokenExpiresAt: isoFromNow(-MINUTE_MS),
      refreshTokenExpiresAt: isoFromNow(-MINUTE_MS),
    });
    expect(evaluate({ doc })).toEqual({ action: "fail", reason: "refreshTokenExpired" });
  });

  it("fails when the refresh token date cannot be read", () => {
    const doc = makeDoc({ refreshTokenExpiresAt: "garbage" });
    expect(evaluate({ doc })).toEqual({ action: "fail", reason: "refreshTokenExpired" });
  });

  it("checks the stored status before the environment", () => {
    const doc = makeDoc({ status: "reconnectRequired", environment: "sandbox" });
    expect(evaluate({ doc, configuredEnvironment: "production" })).toEqual({
      action: "fail",
      reason: "reconnectRequired",
    });
  });
});

describe("classifyRefreshFailure", () => {
  it("treats invalid_grant as revoked, whatever the status", () => {
    expect(classifyRefreshFailure({ status: 400, errorCode: "invalid_grant" })).toBe("revoked");
    expect(classifyRefreshFailure({ status: 500, errorCode: "invalid_grant" })).toBe("revoked");
  });

  it.each([429, 500, 502, 503])("treats HTTP %i as transient", (status) => {
    expect(classifyRefreshFailure({ status, errorCode: null })).toBe("transient");
  });

  it("treats bad client credentials as rejected, so a valid connection is not cleared", () => {
    expect(classifyRefreshFailure({ status: 401, errorCode: "invalid_client" })).toBe("rejected");
  });

  it("treats any other client error as rejected", () => {
    expect(classifyRefreshFailure({ status: 400, errorCode: null })).toBe("rejected");
  });
});
