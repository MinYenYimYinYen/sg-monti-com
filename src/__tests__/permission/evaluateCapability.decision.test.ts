import { describe, it, expect } from "vitest";
import { evaluateCapability } from "@/permission/evaluateCapability";
import { makeLoaders } from "@/__tests__/permission/permissionTestHelpers";

const maria = { userName: "maria" };
// The token says superuser. Only the database can confirm it.
const mariaClaimingSuperUser = { userName: "maria", isSuperUser: true };

describe("evaluateCapability", () => {
  describe("public", () => {
    it("is allowed and reads nothing, with or without an identity", async () => {
      const loaders = makeLoaders();

      expect(await evaluateCapability({ required: "public", identity: null, loaders })).toBe(
        "allowed",
      );
      expect(await evaluateCapability({ required: "public", identity: maria, loaders })).toBe(
        "allowed",
      );

      expect(loaders.confirmSuperUser).not.toHaveBeenCalled();
      expect(loaders.loadCapabilities).not.toHaveBeenCalled();
    });
  });

  describe("no identity", () => {
    it("is unauthenticated and reads nothing", async () => {
      const loaders = makeLoaders({ isSuperUserConfirmed: true, capabilities: ["customers.read"] });

      expect(
        await evaluateCapability({ required: "customers.read", identity: null, loaders }),
      ).toBe("unauthenticated");
      expect(await evaluateCapability({ required: "superUser", identity: null, loaders })).toBe(
        "unauthenticated",
      );

      expect(loaders.confirmSuperUser).not.toHaveBeenCalled();
      expect(loaders.loadCapabilities).not.toHaveBeenCalled();
    });
  });

  describe("an ordinary user", () => {
    it("is allowed a held capability, and never asks the database about superuser", async () => {
      const loaders = makeLoaders({ capabilities: ["customers.read"] });

      const decision = await evaluateCapability({
        required: "customers.read",
        identity: maria,
        loaders,
      });

      expect(decision).toBe("allowed");
      expect(loaders.confirmSuperUser).not.toHaveBeenCalled();
      expect(loaders.loadCapabilities).toHaveBeenCalledTimes(1);
      expect(loaders.loadCapabilities).toHaveBeenCalledWith("maria");
    });

    it("is forbidden a capability they do not hold", async () => {
      const loaders = makeLoaders({ capabilities: ["callLogs.read"] });

      const decision = await evaluateCapability({
        required: "customers.read",
        identity: maria,
        loaders,
      });

      expect(decision).toBe("forbidden");
    });

    it("is forbidden write when they only hold read", async () => {
      const loaders = makeLoaders({ capabilities: ["customers.read"] });

      const decision = await evaluateCapability({
        required: "customers.write",
        identity: maria,
        loaders,
      });

      expect(decision).toBe("forbidden");
    });

    it("is forbidden when they hold nothing (an applied user)", async () => {
      const loaders = makeLoaders({ capabilities: [] });

      const decision = await evaluateCapability({
        required: "customers.read",
        identity: maria,
        loaders,
      });

      expect(decision).toBe("forbidden");
    });

    it("is forbidden superUser, and the capability list is not read", async () => {
      const loaders = makeLoaders({ capabilities: ["bundles.write"] });

      const decision = await evaluateCapability({
        required: "superUser",
        identity: maria,
        loaders,
      });

      expect(decision).toBe("forbidden");
      expect(loaders.confirmSuperUser).not.toHaveBeenCalled();
      expect(loaders.loadCapabilities).not.toHaveBeenCalled();
    });
  });

  describe("a superuser claim in the token", () => {
    it("is confirmed with one read, and a confirmed superuser skips the capability read", async () => {
      const loaders = makeLoaders({ isSuperUserConfirmed: true });

      const decision = await evaluateCapability({
        required: "customers.delete",
        identity: mariaClaimingSuperUser,
        loaders,
      });

      expect(decision).toBe("allowed");
      expect(loaders.confirmSuperUser).toHaveBeenCalledTimes(1);
      expect(loaders.confirmSuperUser).toHaveBeenCalledWith("maria");
      expect(loaders.loadCapabilities).not.toHaveBeenCalled();
    });

    it("allows superUser once confirmed, without reading capabilities", async () => {
      const loaders = makeLoaders({ isSuperUserConfirmed: true });

      const decision = await evaluateCapability({
        required: "superUser",
        identity: mariaClaimingSuperUser,
        loaders,
      });

      expect(decision).toBe("allowed");
      expect(loaders.loadCapabilities).not.toHaveBeenCalled();
    });

    it("falls through to the capability list when the database does not confirm it", async () => {
      const loaders = makeLoaders({ isSuperUserConfirmed: false, capabilities: ["customers.read"] });

      const held = await evaluateCapability({
        required: "customers.read",
        identity: mariaClaimingSuperUser,
        loaders,
      });
      const notHeld = await evaluateCapability({
        required: "customers.delete",
        identity: mariaClaimingSuperUser,
        loaders,
      });

      expect(held).toBe("allowed");
      expect(notHeld).toBe("forbidden");
      expect(loaders.loadCapabilities).toHaveBeenCalledWith("maria");
    });

    it("is forbidden superUser when the database does not confirm it", async () => {
      const loaders = makeLoaders({ isSuperUserConfirmed: false, capabilities: ["customers.read"] });

      const decision = await evaluateCapability({
        required: "superUser",
        identity: mariaClaimingSuperUser,
        loaders,
      });

      expect(decision).toBe("forbidden");
      expect(loaders.confirmSuperUser).toHaveBeenCalledTimes(1);
      expect(loaders.loadCapabilities).not.toHaveBeenCalled();
    });
  });
});
