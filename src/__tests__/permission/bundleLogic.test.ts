import { describe, expect, it } from "vitest";
import { saveBundle } from "@/permission/logic/bundleLogic";
import { allBundles, baselineBundle, flagCan, makeUserGrants, registry, widgetCan } from "./logicFixtures";

function save(overrides: Partial<Parameters<typeof saveBundle>[0]> = {}) {
  return saveBundle({
    bundleKey: "baseline",
    capabilities: baselineBundle.capabilities,
    existingBundles: allBundles,
    users: [],
    registry,
    ...overrides,
  });
}

describe("saveBundle: validation", () => {
  it.each(["", "has space", "a.b", "1abc"])("rejects the bundle key %j", (bundleKey) => {
    expect(save({ bundleKey })).toEqual({ ok: false, reason: "invalidKey" });
  });

  it("rejects unknown capability strings instead of dropping them, listing each once", () => {
    expect(save({ capabilities: [widgetCan.widgets.read, "typo.things.read", "typo.things.read", "x.y.z"] })).toEqual({
      ok: false,
      reason: "unknownCapabilities",
      unknown: ["typo.things.read", "x.y.z"],
    });
  });

  it("rejects a public-verb or never-declared string", () => {
    expect(save({ capabilities: ["widgetManagement.widgets.readAny"] })).toMatchObject({
      ok: false,
      reason: "unknownCapabilities",
    });
  });

  it("accepts an empty bundle", () => {
    expect(save({ bundleKey: "fresh", capabilities: [] })).toMatchObject({ ok: true, capabilities: [] });
  });
});

describe("saveBundle: what changes", () => {
  it("de-duplicates and keeps the order the superuser picked", () => {
    const result = save({
      capabilities: [widgetCan.widgets.write, widgetCan.widgets.read, widgetCan.widgets.write],
    });
    expect(result).toMatchObject({ ok: true, capabilities: [widgetCan.widgets.write, widgetCan.widgets.read] });
  });

  it("reports added and removed against the stored bundle", () => {
    const result = save({ capabilities: [widgetCan.widgets.read, flagCan.custFlags.read] });
    expect(result).toMatchObject({
      ok: true,
      added: [flagCan.custFlags.read],
      removed: [widgetCan.preferences.read],
    });
  });

  it("treats a bundle that does not exist yet as all additions", () => {
    const result = save({ bundleKey: "tech", capabilities: [flagCan.custFlags.read] });
    expect(result).toMatchObject({ ok: true, added: [flagCan.custFlags.read], removed: [], holders: [] });
  });

  it("lists everyone who holds the bundle, and nobody else", () => {
    const users = [
      makeUserGrants({ userName: "dana", bundleKeys: ["baseline"] }),
      makeUserGrants({ userName: "lee", bundleKeys: ["office"] }),
      makeUserGrants({ userName: "sam", bundleKeys: ["baseline", "office"] }),
    ];
    expect(save({ users })).toMatchObject({ ok: true, holders: ["dana", "sam"] });
  });
});

describe("saveBundle: stripping direct grants from holders", () => {
  const widened = [...baselineBundle.capabilities, flagCan.custFlags.read];

  it("strips a direct grant that the saved bundle now lists", () => {
    const users = [makeUserGrants({ userName: "dana", bundleKeys: ["baseline"], capabilities: [flagCan.custFlags.read] })];
    expect(save({ capabilities: widened, users })).toMatchObject({
      ok: true,
      stripDirect: [{ userName: "dana", capabilities: [flagCan.custFlags.read] }],
    });
  });

  it("leaves a holder's unrelated direct grants out of the strip list", () => {
    const users = [makeUserGrants({ userName: "dana", bundleKeys: ["baseline"], capabilities: [flagCan.custFlags.write] })];
    expect(save({ capabilities: widened, users })).toMatchObject({ ok: true, stripDirect: [] });
  });

  it("does not touch a user who does not hold the bundle, even with a matching direct grant", () => {
    const users = [makeUserGrants({ userName: "lee", bundleKeys: ["office"], capabilities: [flagCan.custFlags.read] })];
    expect(save({ capabilities: widened, users })).toMatchObject({ ok: true, stripDirect: [] });
  });

  it("also strips drift that already existed, so re-saving repairs it", () => {
    const users = [makeUserGrants({ userName: "dana", bundleKeys: ["baseline"], capabilities: [widgetCan.widgets.read] })];
    expect(save({ users })).toMatchObject({
      ok: true,
      added: [],
      removed: [],
      stripDirect: [{ userName: "dana", capabilities: [widgetCan.widgets.read] }],
    });
  });

  it("does not strip a direct read next to a bundle write: exact containment only", () => {
    const users = [makeUserGrants({ userName: "dana", bundleKeys: ["office"], capabilities: [flagCan.custFlags.read] })];
    expect(save({ bundleKey: "office", capabilities: [flagCan.custFlags.write], users })).toMatchObject({
      ok: true,
      stripDirect: [],
    });
  });

  it("does not mutate the users", () => {
    const users = [makeUserGrants({ userName: "dana", bundleKeys: ["baseline"], capabilities: [flagCan.custFlags.read] })];
    save({ capabilities: widened, users });
    expect(users[0]!.capabilities).toEqual([flagCan.custFlags.read]);
  });
});
