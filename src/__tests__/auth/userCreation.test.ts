import { describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import {
  canResetPasswordOf,
  duplicateKeyField,
  duplicateKeyMessage,
  judgeBogusSaId,
  judgeRealSaId,
  NO_PASSWORD_PLACEHOLDER,
} from "@/app/auth/_lib/userCreation";

const saId = "ZZ-SUPER1";

describe("judgeBogusSaId", () => {
  it("passes when RealGreen reports no such employee (a 404)", () => {
    expect(
      judgeBogusSaId({
        saId,
        outcome: { kind: "failed", errorType: "EXTERNAL_ERROR", statusCode: 404, message: "Not Found" },
      }),
    ).toEqual({ ok: true });
  });

  it.each([null, undefined, "", "   "])("passes when RealGreen answers with no employee id (%j)", (employeeId) => {
    expect(judgeBogusSaId({ saId, outcome: { kind: "returned", employeeId } })).toEqual({ ok: true });
  });

  it("refuses when the id belongs to a real employee, naming the employee id", () => {
    const verdict = judgeBogusSaId({ saId, outcome: { kind: "returned", employeeId: "ZZ-SUPER1" } });
    expect(verdict).toMatchObject({ ok: false, reason: "realEmployee" });
    expect(verdict.ok === false && verdict.message).toContain("real RealGreen employee");
  });

  it.each([
    ["a network failure", { kind: "failed" as const, errorType: "NETWORK_ERROR", statusCode: 0, message: "Failed to connect to RealGreen" }],
    ["a server error", { kind: "failed" as const, errorType: "EXTERNAL_ERROR", statusCode: 500, message: "Server Error" }],
    ["a bad api key", { kind: "failed" as const, errorType: "EXTERNAL_ERROR", statusCode: 401, message: "Unauthorized" }],
    ["a 400", { kind: "failed" as const, errorType: "EXTERNAL_ERROR", statusCode: 400, message: "Bad Request" }],
    ["an unknown error", { kind: "failed" as const, message: "boom" }],
  ])("fails closed on %s, and says what came back", (_label, outcome) => {
    const verdict = judgeBogusSaId({ saId, outcome });
    expect(verdict).toMatchObject({ ok: false, reason: "lookupFailed" });
    expect(verdict.ok === false && verdict.message).toContain(outcome.message);
  });

  it("does not treat a 404 from anything but RealGreen as 'no such employee'", () => {
    expect(
      judgeBogusSaId({ saId, outcome: { kind: "failed", errorType: "API_ERROR", statusCode: 404, message: "x" } }),
    ).toMatchObject({ ok: false, reason: "lookupFailed" });
  });
});

describe("judgeRealSaId", () => {
  it("passes when RealGreen returns the employee, handing back RealGreen's own id", () => {
    expect(judgeRealSaId({ saId: "1234", outcome: { kind: "returned", employeeId: "1234" } })).toEqual({
      ok: true,
      employeeId: "1234",
    });
  });

  it("matches the id ignoring case and returns RealGreen's casing", () => {
    expect(judgeRealSaId({ saId: "lholker", outcome: { kind: "returned", employeeId: "LHolker" } })).toEqual({
      ok: true,
      employeeId: "LHolker",
    });
  });

  it.each([null, undefined, "", "   "])("refuses when RealGreen answers with no employee id (%j)", (employeeId) => {
    expect(judgeRealSaId({ saId, outcome: { kind: "returned", employeeId } })).toMatchObject({
      ok: false,
      reason: "notAnEmployee",
    });
  });

  it("refuses when RealGreen returns a different employee than the one asked about", () => {
    expect(judgeRealSaId({ saId: "1234", outcome: { kind: "returned", employeeId: "9999" } })).toMatchObject({
      ok: false,
      reason: "notAnEmployee",
    });
  });

  it("refuses a 404 from RealGreen as not an employee", () => {
    expect(
      judgeRealSaId({
        saId,
        outcome: { kind: "failed", errorType: "EXTERNAL_ERROR", statusCode: 404, message: "Not Found" },
      }),
    ).toMatchObject({ ok: false, reason: "notAnEmployee" });
  });

  it.each([
    ["a network failure", { kind: "failed" as const, errorType: "NETWORK_ERROR", statusCode: 0, message: "Failed to connect to RealGreen" }],
    ["a server error", { kind: "failed" as const, errorType: "EXTERNAL_ERROR", statusCode: 500, message: "Server Error" }],
    ["a bad api key", { kind: "failed" as const, errorType: "EXTERNAL_ERROR", statusCode: 401, message: "Unauthorized" }],
    ["an unknown error", { kind: "failed" as const, message: "boom" }],
  ])("fails closed on %s, and says what came back", (_label, outcome) => {
    const verdict = judgeRealSaId({ saId, outcome });
    expect(verdict).toMatchObject({ ok: false, reason: "lookupFailed" });
    expect(verdict.ok === false && verdict.message).toContain(outcome.message);
  });

  it("does not treat a 404 from anything but RealGreen as 'not an employee'", () => {
    expect(
      judgeRealSaId({ saId, outcome: { kind: "failed", errorType: "API_ERROR", statusCode: 404, message: "x" } }),
    ).toMatchObject({ ok: false, reason: "lookupFailed" });
  });
});

describe("duplicateKeyField", () => {
  it("reads the field from a duplicate-key error", () => {
    expect(duplicateKeyField({ code: 11000, keyPattern: { email: 1 } })).toBe("email");
    expect(duplicateKeyField({ code: 11000, keyValue: { userName: "luke" } })).toBe("userName");
  });

  it("returns 'unknown' when the error names no field", () => {
    expect(duplicateKeyField({ code: 11000 })).toBe("unknown");
  });

  it("returns null for other errors", () => {
    expect(duplicateKeyField(new Error("boom"))).toBeNull();
    expect(duplicateKeyField({ code: 121 })).toBeNull();
    expect(duplicateKeyField(null)).toBeNull();
    expect(duplicateKeyField("text")).toBeNull();
  });
});

describe("duplicateKeyMessage", () => {
  it("explains the email case, since each kiosk needs its own address", () => {
    expect(duplicateKeyMessage("email")).toContain("already used");
    expect(duplicateKeyMessage("email")).toContain("nothing is sent");
  });

  it("has a readable message for the other keys and a fallback", () => {
    expect(duplicateKeyMessage("userName")).toContain("taken");
    expect(duplicateKeyMessage("saId")).toContain("saId");
    expect(duplicateKeyMessage("whatever")).toContain("already exists");
  });
});

describe("canResetPasswordOf", () => {
  it("lets an admin reset an ordinary user", () => {
    expect(canResetPasswordOf({ target: {}, actorIsSuperUser: false })).toBe(true);
    expect(canResetPasswordOf({ target: { isSuperUser: false, isKiosk: false }, actorIsSuperUser: false })).toBe(true);
  });

  it("refuses an admin resetting a superuser, which would defeat the Compass-only rule", () => {
    expect(canResetPasswordOf({ target: { isSuperUser: true }, actorIsSuperUser: false })).toBe(false);
  });

  it("refuses an admin resetting a kiosk", () => {
    expect(canResetPasswordOf({ target: { isKiosk: true }, actorIsSuperUser: false })).toBe(false);
  });

  it("lets a superuser reset either", () => {
    expect(canResetPasswordOf({ target: { isSuperUser: true }, actorIsSuperUser: true })).toBe(true);
    expect(canResetPasswordOf({ target: { isKiosk: true }, actorIsSuperUser: true })).toBe(true);
  });
});

describe("NO_PASSWORD_PLACEHOLDER", () => {
  it("is long enough for the model's 4 character minimum", () => {
    expect(NO_PASSWORD_PLACEHOLDER.length).toBeGreaterThanOrEqual(4);
  });

  it("never matches a login attempt, and does not make bcrypt throw", async () => {
    // Checked against the real library: login does bcrypt.compare(password, stored).
    await expect(bcrypt.compare("anything", NO_PASSWORD_PLACEHOLDER)).resolves.toBe(false);
    await expect(bcrypt.compare(NO_PASSWORD_PLACEHOLDER, NO_PASSWORD_PLACEHOLDER)).resolves.toBe(false);
    await expect(bcrypt.compare("", NO_PASSWORD_PLACEHOLDER)).resolves.toBe(false);
  });
});
