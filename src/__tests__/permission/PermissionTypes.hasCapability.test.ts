import { describe, it, expect } from "vitest";
import {
  hasCapability,
  isSuperUserEffective,
  type Capability,
  type CapabilityRequirement,
} from "@/permission/PermissionTypes";

type CheckParams = {
  required: CapabilityRequirement;
  identity?: { userName: string; isSuperUser?: boolean } | null;
  isSuperUserConfirmed?: boolean;
  capabilities?: readonly Capability[];
};

// A signed-in user with no capabilities unless a test says otherwise.
function check({
  required,
  identity = { userName: "maria" },
  isSuperUserConfirmed = false,
  capabilities = [],
}: CheckParams): boolean {
  return hasCapability({ required, identity, isSuperUserConfirmed, capabilities });
}

describe("hasCapability", () => {
  describe("public", () => {
    it("needs no identity", () => {
      expect(check({ required: "public", identity: null })).toBe(true);
    });

    it("needs no capabilities", () => {
      expect(check({ required: "public" })).toBe(true);
    });
  });

  describe("no identity", () => {
    it("is denied a capability", () => {
      expect(
        check({ required: "customers.read", identity: null, capabilities: ["customers.read"] }),
      ).toBe(false);
    });

    it("is denied superUser, even when confirmed", () => {
      expect(
        check({ required: "superUser", identity: null, isSuperUserConfirmed: true }),
      ).toBe(false);
    });

    it("is denied everything even when superuser confirmation is true", () => {
      expect(
        check({ required: "customers.read", identity: null, isSuperUserConfirmed: true }),
      ).toBe(false);
    });
  });

  describe("superuser", () => {
    it("does not bypass on the token claim alone", () => {
      expect(
        check({
          required: "customers.read",
          identity: { userName: "maria", isSuperUser: true },
          isSuperUserConfirmed: false,
        }),
      ).toBe(false);
    });

    it("bypasses the capability list once confirmed", () => {
      expect(
        check({ required: "customers.delete", isSuperUserConfirmed: true, capabilities: [] }),
      ).toBe(true);
    });

    it("bypasses once confirmed, whatever the identity claim says", () => {
      expect(
        check({
          required: "customers.read",
          identity: { userName: "maria", isSuperUser: false },
          isSuperUserConfirmed: true,
        }),
      ).toBe(true);
    });

    it("passes superUser only when confirmed", () => {
      expect(check({ required: "superUser", isSuperUserConfirmed: true })).toBe(true);
      expect(check({ required: "superUser", isSuperUserConfirmed: false })).toBe(false);
    });

    it("never passes superUser on capabilities, whatever they are", () => {
      expect(
        check({
          required: "superUser",
          capabilities: ["bundles.write", "userCapabilities.write", "customers.read"],
        }),
      ).toBe(false);
    });
  });

  describe("capability match", () => {
    it("passes when the capability is held", () => {
      expect(
        check({ required: "customers.read", capabilities: ["callLogs.read", "customers.read"] }),
      ).toBe(true);
    });

    it("fails when the capability is not held", () => {
      expect(check({ required: "customers.read", capabilities: ["callLogs.read"] })).toBe(false);
    });

    it("does not let write stand in for read", () => {
      expect(check({ required: "customers.read", capabilities: ["customers.write"] })).toBe(
        false,
      );
    });

    it("does not let read stand in for write", () => {
      expect(check({ required: "customers.write", capabilities: ["customers.read"] })).toBe(
        false,
      );
    });

    it("matches the whole resource key, not a prefix of it", () => {
      expect(check({ required: "customers.read", capabilities: ["customer.read"] })).toBe(false);
      expect(check({ required: "customer.read", capabilities: ["customers.read"] })).toBe(false);
    });

    it("matches the verb exactly", () => {
      expect(check({ required: "customers.delete", capabilities: ["customers.write"] })).toBe(
        false,
      );
    });
  });

  describe("applied user (signed in, no capabilities)", () => {
    it("passes nothing except public", () => {
      expect(check({ required: "customers.read" })).toBe(false);
      expect(check({ required: "customers.write" })).toBe(false);
      expect(check({ required: "superUser" })).toBe(false);
      expect(check({ required: "public" })).toBe(true);
    });
  });
});

describe("isSuperUserEffective", () => {
  it("is true for a superuser", () => {
    expect(isSuperUserEffective({ isSuperUser: true, isKiosk: false })).toBe(true);
  });

  it("is false for a kiosk, even with the superuser flag set", () => {
    expect(isSuperUserEffective({ isSuperUser: true, isKiosk: true })).toBe(false);
  });

  it("is false for an ordinary user", () => {
    expect(isSuperUserEffective({ isSuperUser: false, isKiosk: false })).toBe(false);
  });

  it("is false when both flags are absent", () => {
    expect(isSuperUserEffective({})).toBe(false);
  });

  it("treats an absent kiosk flag as not a kiosk", () => {
    expect(isSuperUserEffective({ isSuperUser: true })).toBe(true);
  });
});
