import { describe, expect, it, vi } from "vitest";
import { evaluateCapability } from "@/permission/evaluateCapability";
import { Capability } from "@/permission/PermissionTypes";
import {
  appliedUser,
  makeTokenPayload,
  officeCapabilities,
  officeUser,
  superUserTokenHint,
  widgetCapabilities,
} from "./permissionFixtures";

const { can } = widgetCapabilities;

/** Mocked database reads. The spies show which reads a decision actually made. */
function makeLoaders({
  superUserConfirmed = false,
  capabilities = [],
}: { superUserConfirmed?: boolean; capabilities?: readonly Capability[] } = {}) {
  return {
    confirmSuperUser: vi.fn(async () => superUserConfirmed),
    loadCapabilities: vi.fn(async () => capabilities),
  };
}

describe("evaluateCapability: reads only what it needs", () => {
  it("public op reads nothing, even with no identity", async () => {
    const loaders = makeLoaders();
    expect(await evaluateCapability({ required: "public", identity: null, loaders })).toBe("allowed");
    expect(loaders.confirmSuperUser).not.toHaveBeenCalled();
    expect(loaders.loadCapabilities).not.toHaveBeenCalled();
  });

  it("no identity on a protected op is unauthenticated and reads nothing", async () => {
    const loaders = makeLoaders({ capabilities: officeCapabilities });
    expect(await evaluateCapability({ required: can.widgets.read, identity: null, loaders })).toBe("unauthenticated");
    expect(loaders.loadCapabilities).not.toHaveBeenCalled();
  });

  it("a user without the superuser hint is never checked for superuser", async () => {
    const loaders = makeLoaders({ superUserConfirmed: true, capabilities: officeCapabilities });
    await evaluateCapability({ required: can.widgets.read, identity: officeUser, loaders });
    expect(loaders.confirmSuperUser).not.toHaveBeenCalled();
  });

  it("a confirmed superuser skips loading capabilities", async () => {
    const loaders = makeLoaders({ superUserConfirmed: true });
    const decision = await evaluateCapability({ required: can.widgets.delete, identity: superUserTokenHint, loaders });
    expect(decision).toBe("allowed");
    expect(loaders.confirmSuperUser).toHaveBeenCalledWith("superLuke");
    expect(loaders.loadCapabilities).not.toHaveBeenCalled();
  });
});

describe("evaluateCapability: decisions", () => {
  it("allows a user holding the capability", async () => {
    const loaders = makeLoaders({ capabilities: officeCapabilities });
    expect(await evaluateCapability({ required: can.widgets.read, identity: officeUser, loaders })).toBe("allowed");
    expect(loaders.loadCapabilities).toHaveBeenCalledWith("office");
  });

  it("forbids a user missing the capability", async () => {
    const loaders = makeLoaders({ capabilities: officeCapabilities });
    expect(await evaluateCapability({ required: can.widgets.write, identity: officeUser, loaders })).toBe("forbidden");
  });

  it("forbids an applied user (no capabilities) on any protected op", async () => {
    const loaders = makeLoaders();
    expect(await evaluateCapability({ required: can.widgets.read, identity: appliedUser, loaders })).toBe("forbidden");
  });

  it("falls back to capabilities when the superuser hint is not confirmed (flag removed in Compass)", async () => {
    const loaders = makeLoaders({ superUserConfirmed: false, capabilities: [can.widgets.read] });
    expect(await evaluateCapability({ required: can.widgets.read, identity: superUserTokenHint, loaders })).toBe("allowed");
    expect(await evaluateCapability({ required: can.widgets.delete, identity: superUserTokenHint, loaders })).toBe(
      "forbidden",
    );
  });

  it("a kiosk-flagged document is refused as superuser by the loader, so it falls back to its capabilities", async () => {
    const kioskWithHint = makeTokenPayload({ userName: "kiosk1", isSuperUser: true });
    const loaders = makeLoaders({ superUserConfirmed: false, capabilities: [] });
    expect(await evaluateCapability({ required: can.widgets.read, identity: kioskWithHint, loaders })).toBe("forbidden");
  });
});
