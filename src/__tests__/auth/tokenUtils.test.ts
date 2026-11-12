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
  role: "office" as const,
  saId: "SA1",
  userName: "tester",
  mustChangePassword: false,
};

beforeAll(() => {
  process.env.ACCESS_SECRET = "test-access-secret";
  process.env.REFRESH_SECRET = "test-refresh-secret";
});

describe("tokenPayloadFromUser", () => {
  it("carries role, saId and userName (role stays so master keeps working)", () => {
    expect(tokenPayloadFromUser(baseUser)).toMatchObject({ role: "office", saId: "SA1", userName: "tester" });
  });

  it("sets the superuser hint only when the flag is on and the account is not a kiosk", () => {
    expect(tokenPayloadFromUser({ ...baseUser, isSuperUser: true }).isSuperUser).toBe(true);
    expect(tokenPayloadFromUser({ ...baseUser, isSuperUser: true, isKiosk: true }).isSuperUser).toBe(false);
    expect(tokenPayloadFromUser(baseUser).isSuperUser).toBe(false);
  });
});

describe("buildTokenPayload", () => {
  it("copies only claim fields, dropping jwt's exp and iat", () => {
    const decoded = { ...baseUser, isSuperUser: true, exp: 123, iat: 100 };
    expect(Object.keys(buildTokenPayload(decoded)).sort()).toEqual(
      ["isSuperUser", "mustChangePassword", "role", "saId", "userName"],
    );
  });
});

describe("token verification", () => {
  it("round-trips a payload through access and refresh tokens", () => {
    const payload = tokenPayloadFromUser(baseUser);
    expect(verifyAccessToken(signAccessToken(payload)).userName).toBe("tester");
    expect(verifyRefreshToken(signRefreshToken(payload)).userName).toBe("tester");
  });

  it("rejects a token issued before userName existed, forcing a re-login", () => {
    const legacyAccess = jwt.sign({ role: "office", saId: "SA1" }, "test-access-secret");
    const legacyRefresh = jwt.sign({ role: "office", saId: "SA1" }, "test-refresh-secret");
    expect(() => verifyAccessToken(legacyAccess)).toThrow("Session out of date");
    expect(() => verifyRefreshToken(legacyRefresh)).toThrow("Session out of date");
  });

  it("rejects a token signed with the wrong secret", () => {
    const forged = jwt.sign({ ...baseUser }, "not-the-secret");
    expect(() => verifyAccessToken(forged)).toThrow("Invalid or Expired Access Token");
  });
});
