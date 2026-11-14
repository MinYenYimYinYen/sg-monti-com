import { describe, it, expect } from "vitest";
import {
  canAssign,
  canManageCapabilitiesOf,
  isProtectedUser,
} from "@/permission/logic/assignmentGuards";

describe("canAssign", () => {
  it("lets a superuser assign anything, held or not", () => {
    expect(
      canAssign({
        actorIsSuperUser: true,
        actorCapabilities: [],
        granting: ["customers.delete", "bundles.write"],
      }),
    ).toEqual({ allowed: true });
  });

  it("lets anyone else assign what they hold", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: ["customers.read", "customers.write", "callLogs.read"],
        granting: ["customers.read", "callLogs.read"],
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks assigning a capability the actor does not hold, and names it", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: ["customers.read"],
        granting: ["customers.write"],
      }),
    ).toEqual({ allowed: false, missing: ["customers.write"] });
  });

  it("does not let write stand in for read, or read for write", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: ["customers.write"],
        granting: ["customers.read"],
      }),
    ).toEqual({ allowed: false, missing: ["customers.read"] });
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: ["customers.read"],
        granting: ["customers.write"],
      }),
    ).toEqual({ allowed: false, missing: ["customers.write"] });
  });

  it("lists every missing capability, in the order they were granted", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: ["callLogs.read"],
        granting: ["holidays.write", "callLogs.read", "customers.delete", "customers.read"],
      }),
    ).toEqual({
      allowed: false,
      missing: ["holidays.write", "customers.delete", "customers.read"],
    });
  });

  it("blocks the whole assignment when one capability of a bundle is missing", () => {
    const result = canAssign({
      actorIsSuperUser: false,
      actorCapabilities: ["customers.read", "callLogs.read"],
      granting: ["customers.read", "callLogs.read", "callLogs.write"],
    });

    expect(result).toEqual({ allowed: false, missing: ["callLogs.write"] });
  });

  it("allows granting nothing", () => {
    expect(
      canAssign({ actorIsSuperUser: false, actorCapabilities: [], granting: [] }),
    ).toEqual({ allowed: true });
  });

  it("blocks an actor who holds nothing from granting anything", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: [],
        granting: ["customers.read"],
      }),
    ).toEqual({ allowed: false, missing: ["customers.read"] });
  });

  it("repeats a missing capability that was granted twice, so the caller sees what was asked", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: [],
        granting: ["customers.read", "customers.read"],
      }),
    ).toEqual({ allowed: false, missing: ["customers.read", "customers.read"] });
  });
});

describe("isProtectedUser", () => {
  it("protects a superuser", () => {
    expect(isProtectedUser({ isSuperUser: true })).toBe(true);
  });

  it("protects a kiosk", () => {
    expect(isProtectedUser({ isKiosk: true })).toBe(true);
  });

  it("protects a user who is both", () => {
    expect(isProtectedUser({ isSuperUser: true, isKiosk: true })).toBe(true);
  });

  it("does not protect an ordinary user", () => {
    expect(isProtectedUser({ isSuperUser: false, isKiosk: false })).toBe(false);
    expect(isProtectedUser({})).toBe(false);
  });
});

describe("canManageCapabilitiesOf", () => {
  it("lets anyone manage an ordinary user", () => {
    expect(
      canManageCapabilitiesOf({ target: { isSuperUser: false, isKiosk: false }, actorIsSuperUser: false }),
    ).toBe(true);
    expect(canManageCapabilitiesOf({ target: {}, actorIsSuperUser: false })).toBe(true);
  });

  it("lets only a superuser manage a superuser", () => {
    expect(
      canManageCapabilitiesOf({ target: { isSuperUser: true }, actorIsSuperUser: false }),
    ).toBe(false);
    expect(
      canManageCapabilitiesOf({ target: { isSuperUser: true }, actorIsSuperUser: true }),
    ).toBe(true);
  });

  it("lets only a superuser manage a kiosk", () => {
    expect(canManageCapabilitiesOf({ target: { isKiosk: true }, actorIsSuperUser: false })).toBe(
      false,
    );
    expect(canManageCapabilitiesOf({ target: { isKiosk: true }, actorIsSuperUser: true })).toBe(
      true,
    );
  });

  it("lets a superuser manage an ordinary user too", () => {
    expect(canManageCapabilitiesOf({ target: {}, actorIsSuperUser: true })).toBe(true);
  });
});
