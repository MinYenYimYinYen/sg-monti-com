import { describe, expect, it } from "vitest";
import {
  checkPasswordEntry,
  isValidEmail,
  isValidPassword,
  isValidSaId,
  PASSWORD_RULE_MESSAGE,
  validateCreateUser,
} from "@/app/auth/_lib/userValidation";

const valid = {
  userName: "superLuke",
  email: "superluke@example.com",
  firstName: "Super",
  lastName: "Luke",
  saId: "ZZ-SUPER1",
  role: "admin",
  isKiosk: false,
  password: "temp-pass-1",
  mustChangePassword: false,
};

function validate(overrides: Record<string, unknown> = {}) {
  return validateCreateUser({ ...valid, ...overrides });
}

describe("validateCreateUser: accepts", () => {
  it("a complete user", () => {
    expect(validate()).toEqual({ ok: true, value: valid });
  });

  it("a kiosk", () => {
    expect(validate({ isKiosk: true })).toMatchObject({ ok: true, value: { isKiosk: true } });
  });

  it("trims surrounding whitespace", () => {
    expect(validate({ userName: "  superLuke ", firstName: " Super ", saId: " ZZ-SUPER1 " })).toMatchObject({
      ok: true,
      value: { userName: "superLuke", firstName: "Super", saId: "ZZ-SUPER1" },
    });
  });

  it.each(["admin", "office", "tech", "applied"])("the %s role", (role) => {
    expect(validate({ role })).toMatchObject({ ok: true });
  });

  it("a temporary password the user must change", () => {
    expect(validate({ mustChangePassword: true })).toMatchObject({ ok: true, value: { mustChangePassword: true } });
  });

  it("a password exactly at the minimum length", () => {
    expect(validate({ password: "abcd" })).toMatchObject({ ok: true, value: { password: "abcd" } });
  });

  it("a password with surrounding spaces, unchanged (spaces are part of a password)", () => {
    expect(validate({ password: "  pass  " })).toMatchObject({ ok: true, value: { password: "  pass  " } });
  });
});

describe("validateCreateUser: refuses", () => {
  it.each([null, undefined, "text", 5, []])("a body that is %j", (body) => {
    expect(validateCreateUser(body).ok).toBe(false);
  });

  it("a bad username, with the shared rule message", () => {
    expect(validate({ userName: "a b" })).toMatchObject({ ok: false, message: expect.stringContaining("Username") });
    expect(validate({ userName: "a@b" }).ok).toBe(false);
  });

  it.each(["", "nope", "a+b@example.com", "a@b", "a @example.com"])("the email %j", (email) => {
    expect(validate({ email }).ok).toBe(false);
  });

  it.each(["", "   ", "x".repeat(51)])("the first name %j", (firstName) => {
    expect(validate({ firstName }).ok).toBe(false);
    expect(validate({ lastName: firstName }).ok).toBe(false);
  });

  it.each(["", "a/b", "../x", "..", ".", "a b", "a?b", "x".repeat(33)])("the saId %j", (saId) => {
    expect(validate({ saId }).ok).toBe(false);
  });

  it.each(["public", "root", "", "ADMIN"])("the role %j (public is not a user role)", (role) => {
    expect(validate({ role }).ok).toBe(false);
  });

  it.each(["true", 1, null, undefined])("a non-boolean isKiosk %j", (isKiosk) => {
    expect(validate({ isKiosk }).ok).toBe(false);
  });

  it.each(["true", 1, null, undefined])("a non-boolean mustChangePassword %j", (mustChangePassword) => {
    expect(validate({ mustChangePassword }).ok).toBe(false);
  });

  it.each([undefined, null, "", "abc", 1234, { $ne: null }, ["abcd"], "x".repeat(73), "é".repeat(37)])(
    "the password %j",
    (password) => {
      expect(validate({ password })).toMatchObject({ ok: false, message: PASSWORD_RULE_MESSAGE });
    },
  );

  it("a missing password even when the user must change it (a password is always required)", () => {
    expect(validate({ password: undefined, mustChangePassword: true }).ok).toBe(false);
  });
});

describe("validateCreateUser: untrusted input shapes", () => {
  it("refuses an object where text is expected (a Mongo operator in a field)", () => {
    expect(validate({ userName: { $ne: null } }).ok).toBe(false);
    expect(validate({ saId: { $ne: null } }).ok).toBe(false);
    expect(validate({ email: { $gt: "" } }).ok).toBe(false);
  });

  it("refuses numbers and arrays where text is expected", () => {
    expect(validate({ userName: 123 }).ok).toBe(false);
    expect(validate({ saId: ["a"] }).ok).toBe(false);
  });

  it("ignores extra fields, so isSuperUser cannot be set through this op", () => {
    const result = validate({ isSuperUser: true, confirmPassword: "temp-pass-1" });
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.value).not.toHaveProperty("isSuperUser");
    expect(result.ok && result.value).not.toHaveProperty("confirmPassword");
  });
});

describe("isValidPassword", () => {
  it("counts the minimum in characters and the maximum in bytes (bcrypt reads 72 bytes)", () => {
    expect(isValidPassword("abc")).toBe(false);
    expect(isValidPassword("abcd")).toBe(true);
    expect(isValidPassword("x".repeat(72))).toBe(true);
    expect(isValidPassword("x".repeat(73))).toBe(false);
    expect(isValidPassword("é".repeat(36))).toBe(true);
    expect(isValidPassword("é".repeat(37))).toBe(false);
  });
});

describe("checkPasswordEntry", () => {
  it("accepts a matching, valid pair", () => {
    expect(checkPasswordEntry({ password: "temp-pass-1", confirmPassword: "temp-pass-1" })).toBeNull();
  });

  it("refuses a password that breaks the rule before comparing", () => {
    expect(checkPasswordEntry({ password: "abc", confirmPassword: "abc" })).toBe(PASSWORD_RULE_MESSAGE);
  });

  it("refuses a confirmation that differs, including by case or a trailing space", () => {
    expect(checkPasswordEntry({ password: "temp-pass-1", confirmPassword: "Temp-pass-1" })).toContain("do not match");
    expect(checkPasswordEntry({ password: "temp-pass-1", confirmPassword: "temp-pass-1 " })).toContain("do not match");
    expect(checkPasswordEntry({ password: "temp-pass-1", confirmPassword: "" })).toContain("do not match");
  });
});

describe("isValidSaId and isValidEmail", () => {
  it("accept ordinary values", () => {
    expect(isValidSaId("ZZ-SUPER1")).toBe(true);
    expect(isValidSaId("a.b")).toBe(true);
    expect(isValidEmail("kiosk.one@example.com")).toBe(true);
  });

  it("refuse a saId made only of dots, which path normalization would collapse", () => {
    expect(isValidSaId(".")).toBe(false);
    expect(isValidSaId("...")).toBe(false);
  });

  it("refuse a + in an email, as the user model always has", () => {
    expect(isValidEmail("a+kiosk@example.com")).toBe(false);
  });
});
