import { describe, expect, it } from "vitest";
import { isValidEmail, isValidSaId, validateCreateUser } from "@/app/auth/_lib/userValidation";

const valid = {
  userName: "superLuke",
  email: "superluke@example.com",
  firstName: "Super",
  lastName: "Luke",
  saId: "ZZ-SUPER1",
  role: "admin",
  isKiosk: false,
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
    const result = validate({ isSuperUser: true, password: "x" });
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.value).not.toHaveProperty("isSuperUser");
    expect(result.ok && result.value).not.toHaveProperty("password");
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
