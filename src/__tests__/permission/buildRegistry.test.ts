import { describe, expect, expectTypeOf, it } from "vitest";
import { buildRegistry, RegisteredCapability } from "@/permission/buildRegistry";
import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import {
  custFlagCapabilities,
  publicWidgetCapabilities,
  widgetCapabilities,
} from "./permissionFixtures";

const registry = buildRegistry([custFlagCapabilities, widgetCapabilities]);

describe("buildRegistry: allCapabilities", () => {
  it("lists every capability of every feature, in declaration order", () => {
    expect(registry.allCapabilities).toEqual([
      ...custFlagCapabilities.capabilities,
      ...widgetCapabilities.capabilities,
    ]);
  });

  it("is empty for no features", () => {
    const empty = buildRegistry([]);
    expect(empty.allCapabilities).toEqual([]);
    expect(empty.byGroup).toEqual([]);
    expect(empty.has("custFlag.custFlags.realGreen.read")).toBe(false);
  });

  it("leaves public verbs out, since they grant nothing", () => {
    const withPublic = buildRegistry([publicWidgetCapabilities]);
    expect(withPublic.allCapabilities).toEqual([
      "widgetManagement.widgets.write",
      "widgetManagement.widgets.delete",
    ]);
    expect(withPublic.has("widgetManagement.widgets.read")).toBe(false);
  });

  it("agrees with what createFeatureCapabilities produced for every feature", () => {
    for (const feature of [custFlagCapabilities, widgetCapabilities]) {
      for (const capability of feature.capabilities) {
        expect(registry.has(capability)).toBe(true);
      }
    }
  });
});

describe("buildRegistry: has (the unknown-string filter)", () => {
  it("accepts a registered capability", () => {
    expect(registry.has("widgetManagement.widgets.write")).toBe(true);
    expect(registry.has("custFlag.custFlags.realGreen.read")).toBe(true);
  });

  it("rejects a capability that was never declared", () => {
    expect(registry.has("widgetManagement.gadgets.write")).toBe(false);
    expect(registry.has("nothing.here.read")).toBe(false);
  });

  it("rejects a verb the resource does not declare", () => {
    expect(registry.has("custFlag.custFlags.realGreen.delete")).toBe(false);
    expect(registry.has("widgetManagement.preferences.writeAny")).toBe(false);
  });

  it("is exact: a source-less or wrong-source string is unknown", () => {
    expect(registry.has("custFlag.custFlags.read")).toBe(false);
    expect(registry.has("custFlag.custFlags.qbo.read")).toBe(false);
  });

  it("does no prefix or wildcard matching", () => {
    expect(registry.has("widgetManagement.widgets")).toBe(false);
    expect(registry.has("widgetManagement.widgets.*")).toBe(false);
    expect(registry.has("")).toBe(false);
  });
});

describe("buildRegistry: describe", () => {
  it("breaks a native capability into its parts, with no source", () => {
    const description = registry.describe("widgetManagement.preferences.readAny");
    expect(description).toEqual({
      featureKey: "widgetManagement",
      resourceKey: "preferences",
      verb: "readAny",
      groupKey: "widgetManagement",
      groupName: "widgetManagement",
    });
    expect(description).not.toHaveProperty("source");
  });

  it("includes the source for external data", () => {
    expect(registry.describe("custFlag.custFlags.realGreen.write")).toEqual({
      featureKey: "custFlag",
      resourceKey: "custFlags",
      source: "realGreen",
      verb: "write",
      groupKey: "custFlag",
      groupName: "custFlag",
    });
  });

  it("is null for an unknown string", () => {
    expect(registry.describe("custFlag.custFlags.realGreen.delete")).toBeNull();
    expect(registry.describe("nope")).toBeNull();
  });
});

describe("buildRegistry: byGroup", () => {
  it("makes a bare feature a group of one, named by its key", () => {
    expect(registry.byGroup.map((group) => group.key)).toEqual(["custFlag", "widgetManagement"]);
    expect(registry.byGroup[0]).toEqual({
      key: "custFlag",
      name: "custFlag",
      capabilities: custFlagCapabilities.capabilities,
    });
    expect(registry.byGroup[1].capabilities).toEqual(widgetCapabilities.capabilities);
  });

  it("keeps a feature whose capabilities are all public, with an empty list", () => {
    const allPublic = createFeatureCapabilities({
      key: "notices",
      resources: { notices: { shape: "collection", verbs: ["read"] } },
      public: { notices: ["read"] },
    });
    expect(buildRegistry([allPublic]).byGroup).toEqual([{ key: "notices", name: "notices", capabilities: [] }]);
  });
});

describe("buildRegistry: duplicates", () => {
  it("throws on a duplicate feature key", () => {
    expect(() => buildRegistry([widgetCapabilities, widgetCapabilities])).toThrow(
      "Duplicate feature key 'widgetManagement'",
    );
  });

  it("throws on a duplicate feature key even when the resources differ", () => {
    const sameKey = createFeatureCapabilities({
      key: "widgetManagement",
      resources: { gadgets: { shape: "collection", verbs: ["read"] } },
    });
    expect(() => buildRegistry([widgetCapabilities, sameKey])).toThrow("Duplicate feature key");
  });

  it("throws when two features would produce the same capability string", () => {
    // Keys are dot-free, so a clash can only come from a hand-built (not createFeatureCapabilities)
    // declaration. The registry guards the strings anyway because it is the last line of defense.
    const first = { declaration: { key: "a", resources: { b: { shape: "collection", verbs: ["read", "read"] } } } };
    expect(() => buildRegistry([first as never])).toThrow("Duplicate capability 'a.b.read'");
  });
});

// Compile-time checks, enforced by `npx tsc --noEmit`.
describe("RegisteredCapability type", () => {
  it("is the union of every capability string in the list", () => {
    type Registered = RegisteredCapability<[typeof custFlagCapabilities, typeof widgetCapabilities]>;
    expectTypeOf<"custFlag.custFlags.realGreen.read">().toMatchTypeOf<Registered>();
    expectTypeOf<"widgetManagement.preferences.readAny">().toMatchTypeOf<Registered>();
    expectTypeOf<"widgetManagement.widgets.bogus">().not.toMatchTypeOf<Registered>();
  });
});
