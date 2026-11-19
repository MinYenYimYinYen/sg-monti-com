import { beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import {
  buildTokenPayload,
  signAccessToken,
  signRefreshToken,
  tokenPayloadFromUser,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/app/auth/_lib/tokenUtils";

const baseUser = {
  saId: "SA1",
  userName: "tester",
  mustChangePassword: false,
};

beforeAll(() => {
  process.env.ACCESS_SECRET = "test-access-secret";
  process.env.REFRESH_SECRET = "test-refresh-secret";
});

describe("tokenPayloadFromUser", () => {
  it("carries saId, userName and the hasCapabilities claim", () => {
    expect(tokenPayloadFromUser({ user: baseUser, hasCapabilities: true })).toMatchObject({
      saId: "SA1",
      userName: "tester",
      hasCapabilities: true,
    });
    expect(tokenPayloadFromUser({ user: baseUser, hasCapabilities: false }).hasCapabilities).toBe(false);
  });

  it("sets the superuser hint only when the flag is on and the account is not a kiosk", () => {
    const hint = (user: Parameters<typeof tokenPayloadFromUser>[0]["user"]) =>
      tokenPayloadFromUser({ user, hasCapabilities: true }).isSuperUser;
    expect(hint({ ...baseUser, isSuperUser: true })).toBe(true);
    expect(hint({ ...baseUser, isSuperUser: true, isKiosk: true })).toBe(false);
    expect(hint(baseUser)).toBe(false);
  });
});

describe("buildTokenPayload", () => {
  it("copies only claim fields, dropping jwt's exp and iat", () => {
    const decoded = { ...baseUser, isSuperUser: true, hasCapabilities: true, exp: 123, iat: 100 };
    expect(Object.keys(buildTokenPayload(decoded)).sort()).toEqual(
      ["hasCapabilities", "isSuperUser", "mustChangePassword", "saId", "userName"],
    );
  });
});

describe("token verification", () => {
  const payload = tokenPayloadFromUser({ user: baseUser, hasCapabilities: true });

  it("round-trips a payload through access and refresh tokens", () => {
    expect(verifyAccessToken(signAccessToken(payload)).userName).toBe("tester");
    expect(verifyRefreshToken(signRefreshToken(payload)).userName).toBe("tester");
  });

  it("rejects a token issued before userName existed, forcing a re-login", () => {
    const legacyAccess = jwt.sign({ saId: "SA1" }, "test-access-secret");
    const legacyRefresh = jwt.sign({ saId: "SA1" }, "test-refresh-secret");
    expect(() => verifyAccessToken(legacyAccess)).toThrow("Session out of date");
    expect(() => verifyRefreshToken(legacyRefresh)).toThrow("Session out of date");
  });

  it("rejects a token issued before hasCapabilities existed, forcing a re-login", () => {
    const withoutClaim = { saId: "SA1", userName: "tester" };
    expect(() => verifyAccessToken(jwt.sign(withoutClaim, "test-access-secret"))).toThrow("Session out of date");
    expect(() => verifyRefreshToken(jwt.sign(withoutClaim, "test-refresh-secret"))).toThrow("Session out of date");
  });

  it("rejects a token signed with the wrong secret", () => {
    const forged = jwt.sign({ ...payload }, "not-the-secret");
    expect(() => verifyAccessToken(forged)).toThrow("Invalid or Expired Access Token");
  });
});
