import { describe, expect, it } from "vitest";
import { addDirect, removeDirect } from "@/permission/logic/userCapabilityLogic";
import { allBundles, flagCan, makeUserGrants, registry, widgetCan } from "./logicFixtures";

describe("addDirect", () => {
  it("adds a registered capability the user lacks", () => {
    const user = makeUserGrants({ capabilities: [flagCan.custFlags.read] });
    expect(addDirect({ user, capability: flagCan.custFlags.write, bundles: allBundles, registry })).toEqual({
      ok: true,
      capabilities: [flagCan.custFlags.read, flagCan.custFlags.write],
    });
  });

  it("refuses a string the registry does not know", () => {
    expect(addDirect({ user: makeUserGrants(), capability: "made.up.read", bundles: allBundles, registry })).toEqual({
      ok: false,
      reason: "unknownCapability",
    });
  });

  it("refuses a capability already held directly", () => {
    const user = makeUserGrants({ capabilities: [flagCan.custFlags.read] });
    expect(addDirect({ user, capability: flagCan.custFlags.read, bundles: allBundles, registry })).toEqual({
      ok: false,
      reason: "alreadyDirect",
    });
  });

  it("refuses a capability a held bundle already lists, so removing the bundle really removes it", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"] });
    expect(addDirect({ user, capability: widgetCan.widgets.read, bundles: allBundles, registry })).toEqual({
      ok: false,
      reason: "coveredByBundle",
    });
  });

  it("allows a capability that only a bundle the user does not hold lists", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"] });
    expect(addDirect({ user, capability: widgetCan.widgets.write, bundles: allBundles, registry })).toMatchObject({
      ok: true,
    });
  });

  it("allows a direct read next to a bundle's write: no hierarchy", () => {
    const user = makeUserGrants({ bundleKeys: ["office"] });
    expect(addDirect({ user, capability: flagCan.custFlags.read, bundles: allBundles, registry })).toMatchObject({
      ok: true,
    });
  });
});

describe("removeDirect", () => {
  it("removes a held direct grant", () => {
    const user = makeUserGrants({ capabilities: [flagCan.custFlags.read, flagCan.custFlags.write] });
    expect(removeDirect({ user, capability: flagCan.custFlags.read })).toEqual({
      ok: true,
      capabilities: [flagCan.custFlags.write],
    });
  });

  it("removes a stale string the registry no longer knows, so it can be cleaned up", () => {
    const user = makeUserGrants({ capabilities: ["old.thing.read" as never] });
    expect(removeDirect({ user, capability: "old.thing.read" })).toEqual({ ok: true, capabilities: [] });
  });

  it("refuses a capability that is not a direct grant (for example one that comes from a bundle)", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"] });
    expect(removeDirect({ user, capability: widgetCan.widgets.read })).toEqual({ ok: false, reason: "notDirect" });
  });
});
