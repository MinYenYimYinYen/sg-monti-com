import { describe, expect, it } from "vitest";
import {
  assignableCapabilities,
  bundleRegistryDiff,
  holdersByBundleKey,
  redundantDirect,
} from "@/permission/logic/capabilitySelectorLogic";
import { allBundles, baselineBundle, flagCan, makeUserGrants, registry, widgetCan } from "./logicFixtures";

describe("assignableCapabilities", () => {
  it("is the whole registry for a user with nothing", () => {
    expect(assignableCapabilities({ user: makeUserGrants(), bundles: allBundles, registry })).toEqual(
      registry.allCapabilities,
    );
  });

  it("leaves out what a held bundle grants", () => {
    const result = assignableCapabilities({
      user: makeUserGrants({ bundleKeys: ["baseline"] }),
      bundles: allBundles,
      registry,
    });
    for (const capability of baselineBundle.capabilities) expect(result).not.toContain(capability);
    expect(result).toContain(widgetCan.widgets.write);
  });

  it("leaves out direct grants, and counts nothing twice", () => {
    const result = assignableCapabilities({
      user: makeUserGrants({ bundleKeys: ["baseline"], capabilities: [flagCan.custFlags.read] }),
      bundles: allBundles,
      registry,
    });
    expect(result).not.toContain(flagCan.custFlags.read);
    expect(result.length).toBe(registry.allCapabilities.length - baselineBundle.capabilities.length - 1);
  });

  it("still offers a read when the user holds only the write: there is no hierarchy", () => {
    const result = assignableCapabilities({
      user: makeUserGrants({ capabilities: [widgetCan.widgets.write] }),
      bundles: allBundles,
      registry,
    });
    expect(result).toContain(widgetCan.widgets.read);
    expect(result).not.toContain(widgetCan.widgets.write);
  });

  it("is empty when the user holds everything", () => {
    expect(
      assignableCapabilities({
        user: makeUserGrants({ capabilities: registry.allCapabilities }),
        bundles: allBundles,
        registry,
      }),
    ).toEqual([]);
  });

  it("does not offer or count a stale string the registry no longer knows", () => {
    const result = assignableCapabilities({
      user: makeUserGrants({ capabilities: ["old.thing.read" as never] }),
      bundles: allBundles,
      registry,
    });
    expect(result).toEqual(registry.allCapabilities);
  });
});

describe("redundantDirect", () => {
  it("is empty when direct grants and held bundles do not overlap", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"], capabilities: [flagCan.custFlags.read] });
    expect(redundantDirect({ user, bundles: allBundles })).toEqual([]);
  });

  it("lists a direct grant that a held bundle lists literally", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"], capabilities: [widgetCan.widgets.read, flagCan.custFlags.read] });
    expect(redundantDirect({ user, bundles: allBundles })).toEqual([widgetCan.widgets.read]);
  });

  it("ignores a bundle the user does not hold", () => {
    const user = makeUserGrants({ capabilities: [widgetCan.widgets.read] });
    expect(redundantDirect({ user, bundles: allBundles })).toEqual([]);
  });

  it("does not call a direct read redundant next to a bundle write", () => {
    const user = makeUserGrants({ bundleKeys: ["office"], capabilities: [flagCan.custFlags.read] });
    expect(redundantDirect({ user, bundles: allBundles })).toEqual([]);
  });
});

describe("holdersByBundleKey", () => {
  it("maps each bundle to the users who hold it", () => {
    const users = [
      makeUserGrants({ userName: "dana", bundleKeys: ["baseline", "office"] }),
      makeUserGrants({ userName: "lee", bundleKeys: ["baseline"] }),
      makeUserGrants({ userName: "sam" }),
    ];
    expect(holdersByBundleKey({ users })).toEqual({ baseline: ["dana", "lee"], office: ["dana"] });
  });

  it("has no entry for a bundle nobody holds, and counts a repeated key once", () => {
    const users = [makeUserGrants({ userName: "dana", bundleKeys: ["baseline", "baseline"] })];
    expect(holdersByBundleKey({ users })).toEqual({ baseline: ["dana"] });
  });

  it("is empty for no users", () => {
    expect(holdersByBundleKey({ users: [] })).toEqual({});
  });
});

describe("bundleRegistryDiff", () => {
  it("reports what the bundle lacks and has nothing stale for a clean bundle", () => {
    const { lacks, stale } = bundleRegistryDiff({ bundle: baselineBundle, registry });
    expect(stale).toEqual([]);
    expect(lacks).toContain(widgetCan.widgets.write);
    expect(lacks).not.toContain(widgetCan.widgets.read);
  });

  it("flags strings the registry no longer knows", () => {
    const bundle = { bundleKey: "old", capabilities: [widgetCan.widgets.read, "gone.thing.read" as never] };
    expect(bundleRegistryDiff({ bundle, registry }).stale).toEqual(["gone.thing.read"]);
  });

  it("lacks everything for an empty bundle", () => {
    expect(bundleRegistryDiff({ bundle: { bundleKey: "empty", capabilities: [] }, registry }).lacks).toEqual(
      registry.allCapabilities,
    );
  });
});
