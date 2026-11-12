import { describe, expect, it, vi } from "vitest";
import { evaluateCapability } from "@/permission/evaluateCapability";
import {
  appliedUser,
  check,
  officeCapabilities,
  officeUser,
  superUserTokenHint,
  widgetCapabilities,
} from "./permissionFixtures";

const { can } = widgetCapabilities;

describe("hasCapability: the 'superUser' requirement", () => {
  it("passes a confirmed superuser", () => {
    expect(check({ required: "superUser", identity: superUserTokenHint, isSuperUserConfirmed: true })).toBe(true);
  });

  it("fails a user holding every capability, since it cannot be granted", () => {
    expect(check({ required: "superUser", identity: officeUser, capabilities: officeCapabilities })).toBe(false);
    expect(check({ required: "superUser", identity: officeUser, capabilities: ["superUser" as never] })).toBe(false);
  });

  it("fails the unconfirmed token hint", () => {
    expect(check({ required: "superUser", identity: superUserTokenHint, isSuperUserConfirmed: false })).toBe(false);
  });

  it("fails an applied user and a missing identity, even with the confirmation set", () => {
    expect(check({ required: "superUser", identity: appliedUser })).toBe(false);
    expect(check({ required: "superUser", identity: null, isSuperUserConfirmed: true })).toBe(false);
  });
});

describe("evaluateCapability: the 'superUser' requirement", () => {
  function makeLoaders(superUserConfirmed: boolean) {
    return {
      confirmSuperUser: vi.fn(async () => superUserConfirmed),
      loadCapabilities: vi.fn(async () => officeCapabilities),
    };
  }

  it("allows a confirmed superuser and never loads capabilities", async () => {
    const loaders = makeLoaders(true);
    expect(await evaluateCapability({ required: "superUser", identity: superUserTokenHint, loaders })).toBe("allowed");
    expect(loaders.loadCapabilities).not.toHaveBeenCalled();
  });

  it("forbids a user without the hint, without any database read", async () => {
    const loaders = makeLoaders(true);
    expect(await evaluateCapability({ required: "superUser", identity: officeUser, loaders })).toBe("forbidden");
    expect(loaders.confirmSuperUser).not.toHaveBeenCalled();
    expect(loaders.loadCapabilities).not.toHaveBeenCalled();
  });

  it("forbids an unconfirmed hint, and still skips loading capabilities", async () => {
    const loaders = makeLoaders(false);
    expect(await evaluateCapability({ required: "superUser", identity: superUserTokenHint, loaders })).toBe("forbidden");
    expect(loaders.loadCapabilities).not.toHaveBeenCalled();
  });

  it("is unauthenticated with no identity", async () => {
    const loaders = makeLoaders(true);
    expect(await evaluateCapability({ required: "superUser", identity: null, loaders })).toBe("unauthenticated");
  });

  it("does not change a normal capability op: the superuser bypass and the capability lookup still apply", async () => {
    const loaders = makeLoaders(false);
    expect(await evaluateCapability({ required: can.widgets.read, identity: officeUser, loaders })).toBe("allowed");
    expect(loaders.loadCapabilities).toHaveBeenCalledTimes(1);
  });
});
