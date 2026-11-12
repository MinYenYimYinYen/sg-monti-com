import { describe, expect, it } from "vitest";
import { resolveEffective } from "@/permission/logic/resolveEffective";
import { allBundles, baselineBundle, flagCan, officeBundle, registry, widgetCan } from "./logicFixtures";

function resolve(overrides: Partial<Parameters<typeof resolveEffective>[0]> = {}) {
  return resolveEffective({ bundleKeys: [], directCapabilities: [], bundles: allBundles, registry, ...overrides });
}

describe("resolveEffective", () => {
  it("is empty for a user with nothing (an applied user)", () => {
    expect(resolve()).toEqual([]);
  });

  it("returns a bundle's capabilities", () => {
    expect(resolve({ bundleKeys: ["baseline"] })).toEqual(baselineBundle.capabilities);
  });

  it("returns direct grants", () => {
    expect(resolve({ directCapabilities: [flagCan.custFlags.read] })).toEqual([flagCan.custFlags.read]);
  });

  it("is the union of bundles and direct grants", () => {
    expect(resolve({ bundleKeys: ["baseline"], directCapabilities: [flagCan.custFlags.read] })).toEqual([
      widgetCan.widgets.read,
      widgetCan.preferences.read,
      flagCan.custFlags.read,
    ]);
  });

  it("de-duplicates across bundles and direct grants", () => {
    const result = resolve({ bundleKeys: ["baseline", "office"], directCapabilities: [widgetCan.widgets.read] });
    expect(result.filter((capability) => capability === widgetCan.widgets.read)).toHaveLength(1);
    expect(new Set(result).size).toBe(result.length);
  });

  it("lists bundle capabilities first, in bundle order, then direct grants", () => {
    expect(resolve({ bundleKeys: ["office", "baseline"], directCapabilities: [flagCan.custFlags.read] })).toEqual([
      ...officeBundle.capabilities,
      widgetCan.preferences.read,
      flagCan.custFlags.read,
    ]);
  });

  it("adds nothing: write does not bring read (there is no hierarchy)", () => {
    const result = resolve({ directCapabilities: [widgetCan.widgets.write] });
    expect(result).toEqual([widgetCan.widgets.write]);
    expect(result).not.toContain(widgetCan.widgets.read);
  });

  it("drops strings the registry does not know, from a bundle and from direct grants", () => {
    const staleBundle = { bundleKey: "stale", capabilities: [widgetCan.widgets.read, "old.thing.read" as never] };
    const result = resolve({
      bundleKeys: ["stale"],
      bundles: [staleBundle],
      directCapabilities: ["renamed.gadgets.write" as never, flagCan.custFlags.read],
    });
    expect(result).toEqual([widgetCan.widgets.read, flagCan.custFlags.read]);
  });

  it("ignores a bundle key with no matching bundle", () => {
    expect(resolve({ bundleKeys: ["deleted", "baseline"] })).toEqual(baselineBundle.capabilities);
  });

  it("does not mutate its inputs", () => {
    const bundleKeys = ["baseline"];
    const directCapabilities = [flagCan.custFlags.read];
    resolve({ bundleKeys, directCapabilities });
    expect(bundleKeys).toEqual(["baseline"]);
    expect(directCapabilities).toEqual([flagCan.custFlags.read]);
  });
});
