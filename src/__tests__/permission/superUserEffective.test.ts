import { describe, expect, it } from "vitest";
import { User } from "@/app/auth/_types/User";
import { hasCapability, isSuperUserEffective } from "@/permission/PermissionTypes";
import { widgetCapabilities } from "./permissionFixtures";

const { can } = widgetCapabilities;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    email: "tester@example.com",
    firstName: "Test",
    lastName: "User",
    userName: "tester",
    role: "office",
    saId: "SA1",
    ...overrides,
  };
}

describe("isSuperUserEffective", () => {
  it("is true only when the flag is set and the account is not a kiosk", () => {
    expect(isSuperUserEffective({ isSuperUser: true })).toBe(true);
    expect(isSuperUserEffective({ isSuperUser: true, isKiosk: false })).toBe(true);
    expect(isSuperUserEffective({ isSuperUser: true, isKiosk: true })).toBe(false);
  });

  it("is false when the flag is absent or false (the fields are optional)", () => {
    expect(isSuperUserEffective({})).toBe(false);
    expect(isSuperUserEffective({ isSuperUser: false })).toBe(false);
    expect(isSuperUserEffective({ isKiosk: true })).toBe(false);
  });
});

// The client passes the User from the store, so the check must accept one directly.
describe("hasCapability with a User (client <Can>)", () => {
  it("passes a user holding the capability", () => {
    const user = makeUser();
    expect(
      hasCapability({
        required: can.widgets.read,
        identity: user,
        isSuperUserConfirmed: isSuperUserEffective(user),
        capabilities: [can.widgets.read],
      }),
    ).toBe(true);
  });

  it("passes a superuser with no capabilities, but not a kiosk carrying the flag", () => {
    const superUser = makeUser({ isSuperUser: true });
    const kiosk = makeUser({ userName: "kiosk1", isSuperUser: true, isKiosk: true });
    const check = (user: User) =>
      hasCapability({
        required: can.widgets.delete,
        identity: user,
        isSuperUserConfirmed: isSuperUserEffective(user),
        capabilities: [],
      });
    expect(check(superUser)).toBe(true);
    expect(check(kiosk)).toBe(false);
  });
});
