import { describe, expect, expectTypeOf, it } from "vitest";
import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import {
  custFlagCapabilities,
  publicWidgetCapabilities,
  widgetCapabilities,
} from "./permissionFixtures";

describe("createFeatureCapabilities: capability strings", () => {
  it("builds native strings as feature.resource.verb", () => {
    expect(widgetCapabilities.can.widgets.write).toBe("widgetManagement.widgets.write");
    expect(widgetCapabilities.can.widgets.delete).toBe("widgetManagement.widgets.delete");
  });

  it("adds the source segment for external data", () => {
    expect(custFlagCapabilities.can.custFlags.read).toBe("custFlag.custFlags.realGreen.read");
    expect(custFlagCapabilities.can.custFlags.write).toBe("custFlag.custFlags.realGreen.write");
  });

  it("builds userOwned any-verbs", () => {
    expect(widgetCapabilities.can.preferences.readAny).toBe("widgetManagement.preferences.readAny");
  });

  it("lists exactly the declared verbs, no more", () => {
    expect(custFlagCapabilities.capabilities).toEqual([
      "custFlag.custFlags.realGreen.read",
      "custFlag.custFlags.realGreen.write",
    ]);
    expect(widgetCapabilities.capabilities).toEqual([
      "widgetManagement.widgets.read",
      "widgetManagement.widgets.write",
      "widgetManagement.widgets.delete",
      "widgetManagement.preferences.read",
      "widgetManagement.preferences.write",
      "widgetManagement.preferences.delete",
      "widgetManagement.preferences.readAny",
    ]);
  });

  it("keeps the declaration it was built from", () => {
    expect(widgetCapabilities.declaration.key).toBe("widgetManagement");
  });
});

describe("createFeatureCapabilities: public verbs", () => {
  it("resolves a public verb to 'public'", () => {
    expect(publicWidgetCapabilities.can.widgets.read).toBe("public");
  });

  it("leaves other verbs on the same resource as capabilities", () => {
    expect(publicWidgetCapabilities.can.widgets.write).toBe("widgetManagement.widgets.write");
    expect(publicWidgetCapabilities.can.widgets.delete).toBe("widgetManagement.widgets.delete");
  });

  it("keeps public verbs out of the capability list, since they grant nothing", () => {
    expect(publicWidgetCapabilities.capabilities).toEqual([
      "widgetManagement.widgets.write",
      "widgetManagement.widgets.delete",
    ]);
  });
});

describe("createFeatureCapabilities: validation", () => {
  it("throws when public references an unknown resource", () => {
    expect(() =>
      createFeatureCapabilities({
        key: "broken",
        resources: { widgets: { shape: "collection", verbs: ["read"] } },
        public: { gadgets: ["read"] },
      }),
    ).toThrow("broken: public references unknown resource 'gadgets'");
  });

  it("throws when public lists a verb the resource does not declare", () => {
    expect(() =>
      createFeatureCapabilities({
        key: "broken",
        resources: { widgets: { shape: "collection", verbs: ["read"] } },
        public: { widgets: ["delete"] },
      }),
    ).toThrow("broken: public lists undeclared verb 'widgets.delete'");
  });
});

describe("createFeatureCapabilities: key format", () => {
  it.each(["a.b", "has space", "", "1abc", "a@b", "a*"])("rejects the feature key %j", (key) => {
    expect(() =>
      createFeatureCapabilities({
        key,
        resources: { widgets: { shape: "collection", verbs: ["read"] } },
      }),
    ).toThrow("Invalid feature key");
  });

  it.each(["a.b", "has space", "", "1abc"])("rejects the resource key %j", (resourceKey) => {
    expect(() =>
      createFeatureCapabilities({
        key: "widgets",
        resources: { [resourceKey]: { shape: "collection", verbs: ["read"] } },
      }),
    ).toThrow("Invalid resource key");
  });

  it.each(["widgetManagement", "cust-flag", "cust_flag", "a1"])("accepts the feature key %j", (key) => {
    expect(() =>
      createFeatureCapabilities({
        key,
        resources: { widgets: { shape: "collection", verbs: ["read"] } },
      }),
    ).not.toThrow();
  });
});

describe("createFeatureCapabilities: requires", () => {
  const resources = { widgets: { shape: "collection", verbs: ["read", "write"] } } as const;

  it("accepts a requirement on a declared resource.verb", () => {
    expect(() =>
      createFeatureCapabilities({
        key: "widgets",
        resources,
        requires: { "widgets.write": ["other.things.read"] },
      }),
    ).not.toThrow();
  });

  it.each(["widgets", "widgets.delete", "gadgets.read", "widgets.write.extra", ""])(
    "rejects a requires key that is not a declared resource.verb: %j",
    (requirementKey) => {
      expect(() =>
        createFeatureCapabilities({
          key: "widgets",
          resources,
          requires: { [requirementKey]: ["other.things.read"] },
        }),
      ).toThrow("requires lists unknown capability");
    },
  );

  it("rejects a requirement attached to a public verb, which grants nothing", () => {
    expect(() =>
      createFeatureCapabilities({
        key: "widgets",
        resources,
        public: { widgets: ["read"] },
        requires: { "widgets.read": ["other.things.read"] },
      }),
    ).toThrow("public verb");
  });

  it("rejects an empty requirement string", () => {
    expect(() =>
      createFeatureCapabilities({
        key: "widgets",
        resources,
        requires: { "widgets.write": [""] as never },
      }),
    ).toThrow("empty capability");
  });
});

// Compile-time checks: they are no-ops at runtime and are enforced by `npx tsc --noEmit`.
describe("createFeatureCapabilities: type inference", () => {
  it("infers literal capability strings", () => {
    expectTypeOf(custFlagCapabilities.can.custFlags.write).toEqualTypeOf<"custFlag.custFlags.realGreen.write">();
    expectTypeOf(widgetCapabilities.can.widgets.read).toEqualTypeOf<"widgetManagement.widgets.read">();
  });

  it("infers 'public' for a public verb and a capability for the rest", () => {
    expectTypeOf(publicWidgetCapabilities.can.widgets.read).toEqualTypeOf<"public">();
    expectTypeOf(publicWidgetCapabilities.can.widgets.write).toEqualTypeOf<"widgetManagement.widgets.write">();
  });

  it("only exposes declared verbs", () => {
    expectTypeOf(custFlagCapabilities.can.custFlags).not.toHaveProperty("delete");
    expectTypeOf(widgetCapabilities.can.preferences).toHaveProperty("readAny");
    expectTypeOf(widgetCapabilities.can.preferences).not.toHaveProperty("writeAny");
  });
});
