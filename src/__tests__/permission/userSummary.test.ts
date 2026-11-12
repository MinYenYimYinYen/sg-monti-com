import { describe, expect, it } from "vitest";
import { matchesUserSearch, sortUserSummaries, toUserSummary } from "@/permission/logic/userSummary";

const dana = toUserSummary({
  userName: "dana", firstName: "Dana", lastName: "Reyes", saId: "SA-1", role: "office",
});

function summary(overrides: Partial<ReturnType<typeof toUserSummary>> = {}) {
  return { ...dana, ...overrides };
}

describe("toUserSummary", () => {
  it("copies the listed fields and turns missing flags into false", () => {
    expect(dana).toEqual({
      userName: "dana", firstName: "Dana", lastName: "Reyes", saId: "SA-1", role: "office",
      isSuperUser: false, isKiosk: false,
    });
  });

  it("keeps true flags", () => {
    expect(toUserSummary({ ...dana, isSuperUser: true, isKiosk: true })).toMatchObject({ isSuperUser: true, isKiosk: true });
  });

  it("never carries a password hash or any other field from the document", () => {
    const document = { ...dana, password: "$2b$10$hash", email: "d@example.com", mustChangePassword: true };
    const result = toUserSummary(document);
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("mustChangePassword");
  });
});

describe("sortUserSummaries", () => {
  it("sorts by last name, then first name, then username, ignoring case", () => {
    const sorted = sortUserSummaries([
      summary({ userName: "c", firstName: "Zed", lastName: "adams" }),
      summary({ userName: "b", firstName: "Amy", lastName: "Baker" }),
      summary({ userName: "a", firstName: "Bo", lastName: "Adams" }),
      summary({ userName: "d", firstName: "Bo", lastName: "Adams" }),
    ]);
    expect(sorted.map((user) => user.userName)).toEqual(["a", "d", "c", "b"]);
  });

  it("returns a new list and leaves the input alone", () => {
    const input = [summary({ lastName: "Z" }), summary({ lastName: "A" })];
    const sorted = sortUserSummaries(input);
    expect(sorted).not.toBe(input);
    expect(input.map((user) => user.lastName)).toEqual(["Z", "A"]);
  });
});

describe("matchesUserSearch", () => {
  it("matches everyone for an empty or blank search", () => {
    expect(matchesUserSearch({ user: dana, search: "" })).toBe(true);
    expect(matchesUserSearch({ user: dana, search: "   " })).toBe(true);
  });

  it.each(["dana", "REY", "dana reyes", "sa-1", "  dana "])("matches %j", (search) => {
    expect(matchesUserSearch({ user: dana, search })).toBe(true);
  });

  it.each(["lee", "sa-2", "reyes dana"])("does not match %j", (search) => {
    expect(matchesUserSearch({ user: dana, search })).toBe(false);
  });
});
