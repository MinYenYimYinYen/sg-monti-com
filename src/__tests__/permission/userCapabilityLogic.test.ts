import { describe, expect, it } from "vitest";
import { addDirect, assignBundle, removeBundle, removeDirect } from "@/permission/logic/userCapabilityLogic";
import { allBundles, flagCan, makeUserGrants, registry, widgetCan } from "./logicFixtures";

describe("assignBundle", () => {
  it("adds the bundle key and leaves unrelated direct grants alone", () => {
    const user = makeUserGrants({ capabilities: [flagCan.custFlags.read] });
    expect(assignBundle({ user, bundleKey: "baseline", bundles: allBundles })).toEqual({
      ok: true,
      bundleKeys: ["baseline"],
      capabilities: [flagCan.custFlags.read],
      removedDirect: [],
    });
  });

  it("removes the direct grants the bundle already lists, and reports them", () => {
    const user = makeUserGrants({ capabilities: [widgetCan.widgets.read, flagCan.custFlags.read] });
    expect(assignBundle({ user, bundleKey: "baseline", bundles: allBundles })).toEqual({
      ok: true,
      bundleKeys: ["baseline"],
      capabilities: [flagCan.custFlags.read],
      removedDirect: [widgetCan.widgets.read],
    });
  });

  it("keeps a direct read when the bundle lists only the write: redundancy is exact, not hierarchical", () => {
    const user = makeUserGrants({ capabilities: [flagCan.custFlags.read] });
    const result = assignBundle({ user, bundleKey: "office", bundles: allBundles });
    expect(result).toMatchObject({ ok: true, capabilities: [flagCan.custFlags.read], removedDirect: [] });
  });

  it("appends to bundles already held", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"] });
    expect(assignBundle({ user, bundleKey: "office", bundles: allBundles })).toMatchObject({
      ok: true,
      bundleKeys: ["baseline", "office"],
    });
  });

  it("refuses an unknown bundle", () => {
    expect(assignBundle({ user: makeUserGrants(), bundleKey: "nope", bundles: allBundles })).toEqual({
      ok: false,
      reason: "unknownBundle",
    });
  });

  it("refuses a bundle the user already holds", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"] });
    expect(assignBundle({ user, bundleKey: "baseline", bundles: allBundles })).toEqual({
      ok: false,
      reason: "alreadyAssigned",
    });
  });

  it("does not mutate the user", () => {
    const user = makeUserGrants({ capabilities: [widgetCan.widgets.read] });
    assignBundle({ user, bundleKey: "baseline", bundles: allBundles });
    expect(user.capabilities).toEqual([widgetCan.widgets.read]);
    expect(user.bundleKeys).toEqual([]);
  });
});

describe("removeBundle", () => {
  it("reports everything the user loses when the bundle was the only source", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"] });
    const result = removeBundle({ user, bundleKey: "baseline", bundles: allBundles, registry });
    expect(result).toEqual({
      ok: true,
      bundleKeys: [],
      lost: [widgetCan.widgets.read, widgetCan.preferences.read],
    });
  });

  it("does not count what another held bundle still grants", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline", "office"] });
    const result = removeBundle({ user, bundleKey: "baseline", bundles: allBundles, registry });
    expect(result).toEqual({ ok: true, bundleKeys: ["office"], lost: [widgetCan.preferences.read] });
  });

  it("does not count what the user holds directly, and never touches direct grants", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"], capabilities: [flagCan.custFlags.read] });
    const result = removeBundle({ user, bundleKey: "baseline", bundles: allBundles, registry });
    expect(result).toMatchObject({ ok: true, lost: [widgetCan.widgets.read, widgetCan.preferences.read] });
    expect(user.capabilities).toEqual([flagCan.custFlags.read]);
  });

  it("loses nothing for a direct grant that duplicates the bundle (drift): the user keeps it", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"], capabilities: [widgetCan.widgets.read] });
    const result = removeBundle({ user, bundleKey: "baseline", bundles: allBundles, registry });
    expect(result).toMatchObject({ ok: true, lost: [widgetCan.preferences.read] });
  });

  it("refuses a bundle the user does not hold", () => {
    expect(removeBundle({ user: makeUserGrants(), bundleKey: "baseline", bundles: allBundles, registry })).toEqual({
      ok: false,
      reason: "notAssigned",
    });
  });
});
