import { describe, expect, it } from "vitest";
import { escapeRegExp, exactMatchIgnoreCase, isValidUserName } from "@/app/auth/_lib/userNameUtils";

describe("isValidUserName", () => {
  it.each(["luke", "Luke.H", "tech_01", "a-b", "abc", "x".repeat(32)])("accepts %s", (userName) => {
    expect(isValidUserName(userName)).toBe(true);
  });

  it.each(["", "ab", "x".repeat(33), "a b", "a@b", "a.*", "(abc)", "a[b]", "a\\b", "a$", "name\n"])(
    "rejects %j",
    (userName) => {
      expect(isValidUserName(userName)).toBe(false);
    },
  );
});

describe("exactMatchIgnoreCase", () => {
  it("matches the whole string regardless of case", () => {
    expect(exactMatchIgnoreCase("Luke").test("luke")).toBe(true);
    expect(exactMatchIgnoreCase("Luke").test("LUKE")).toBe(true);
    expect(exactMatchIgnoreCase("Luke").test("lukey")).toBe(false);
    expect(exactMatchIgnoreCase("Luke").test("xluke")).toBe(false);
  });

  it("treats regex characters as literal text", () => {
    expect(exactMatchIgnoreCase("a.c").test("abc")).toBe(false);
    expect(exactMatchIgnoreCase("a.c").test("a.c")).toBe(true);
    expect(exactMatchIgnoreCase(".*").test("anyone")).toBe(false);
  });

  it("does not throw on an unbalanced pattern", () => {
    expect(() => exactMatchIgnoreCase("(abc")).not.toThrow();
    expect(() => exactMatchIgnoreCase("[abc")).not.toThrow();
  });
});

describe("escapeRegExp", () => {
  it("escapes every regex metacharacter", () => {
    expect(escapeRegExp(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });
});
