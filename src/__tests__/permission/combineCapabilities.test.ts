import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/permission/buildRegistry";
import { combineCapabilities } from "@/permission/combineCapabilities";
import { mergeRecords } from "@/permission/mergeRecords";
import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { custFlagCapabilities, reportCapabilities, widgetCapabilities } from "./permissionFixtures";

// Two features that both own a `customers` resource, like quickbooks and customer in the app.
const billingCapabilities = createFeatureCapabilities({
  key: "billing",
  resources: { customers: { shape: "collection", source: "qbo", verbs: ["read"] } },
});
const crmCapabilities = createFeatureCapabilities({
  key: "crm",
  resources: { customers: { shape: "collection", source: "realGreen", verbs: ["read", "write"] } },
});

const group = { key: "flagsAndWidgets", name: "Flags and widgets", description: "Both, together." };

describe("mergeRecords", () => {
  it("merges several records, renaming each one's keys", () => {
    const merged = mergeRecords({
      what: "thing",
      parts: [
        { record: { a: 1 }, rekey: (key) => `x_${key}` },
        { record: { a: 2, b: 3 }, rekey: (key) => `y_${key}` },
      ],
    });
    expect(merged).toEqual({ x_a: 1, y_a: 2, y_b: 3 });
  });

  it("throws on a duplicate instead of overwriting", () => {
    expect(() =>
      mergeRecords({
        what: "thing",
        parts: [
          { record: { a: 1 }, rekey: (key) => key },
          { record: { a: 2 }, rekey: (key) => key },
        ],
      }),
    ).toThrow("Duplicate thing 'a' while merging");
  });

  it("is empty for no parts", () => {
    expect(mergeRecords({ what: "thing", parts: [] })).toEqual({});
  });
});

describe("combineCapabilities", () => {
  const combined = combineCapabilities({ ...group, features: [custFlagCapabilities, widgetCapabilities] });

  it("lists exactly the capabilities of its features, with their own strings", () => {
    expect(combined.capabilities).toEqual([...custFlagCapabilities.capabilities, ...widgetCapabilities.capabilities]);
  });

  it("nests `can` by feature, so enforcement keeps using the feature's own constants", () => {
    expect(combined.can.custFlag).toBe(custFlagCapabilities.can);
    expect(combined.can.widgetManagement.widgets.write).toBe("widgetManagement.widgets.write");
  });

  it("carries the name and description on the declaration", () => {
    expect(combined.declaration.name).toBe("Flags and widgets");
    expect(combined.declaration.description).toBe("Both, together.");
  });

  it("renames each resource by its feature and records where it came from", () => {
    expect(Object.keys(combined.declaration.resources)).toEqual([
      "custFlag_custFlags",
      "widgetManagement_widgets",
      "widgetManagement_preferences",
    ]);
    expect(combined.declaration.resources.custFlag_custFlags.origin).toEqual({
      featureKey: "custFlag",
      resourceKey: "custFlags",
    });
  });

  it("re-keys requires with the resource prefix and keeps the capability strings", () => {
    const withRequirements = combineCapabilities({ ...group, features: [custFlagCapabilities, reportCapabilities] });
    expect(withRequirements.declaration.requires).toEqual({
      "reports_reports.read": reportCapabilities.declaration.requires?.["reports.read"],
      "reports_exports.read": ["reports.reports.read"],
    });
  });

  it("omits requires and public when no feature has any", () => {
    expect(combined.declaration).not.toHaveProperty("requires");
    expect(combined.declaration).not.toHaveProperty("public");
  });

  it("rejects an empty list, a bad key and the same feature twice", () => {
    expect(() => combineCapabilities({ ...group, features: [] })).toThrow("combines no features");
    expect(() => combineCapabilities({ ...group, key: "a.b", features: [custFlagCapabilities] })).toThrow(
      "Invalid group key",
    );
    expect(() => combineCapabilities({ ...group, features: [custFlagCapabilities, custFlagCapabilities] })).toThrow(
      "Duplicate resource 'custFlag_custFlags'",
    );
  });
});

describe("combineCapabilities in the registry", () => {
  it("builds the same capability strings as registering the features one by one", () => {
    const features = [custFlagCapabilities, widgetCapabilities, reportCapabilities] as const;
    const separate = buildRegistry(features);
    const grouped = buildRegistry([combineCapabilities({ ...group, features })]);

    expect(grouped.allCapabilities).toEqual(separate.allCapabilities);
    for (const capability of separate.allCapabilities) {
      expect(grouped.has(capability)).toBe(true);
      expect(grouped.requirementsOf(capability)).toEqual(separate.requirementsOf(capability));
    }
  });

  it("keeps two features' same-named resources apart, with their own strings", () => {
    const grouped = buildRegistry([combineCapabilities({ ...group, features: [billingCapabilities, crmCapabilities] })]);
    expect(grouped.allCapabilities).toEqual([
      "billing.customers.qbo.read",
      "crm.customers.realGreen.read",
      "crm.customers.realGreen.write",
    ]);
  });

  it("describes a capability by its owning feature and by its group", () => {
    const grouped = buildRegistry([combineCapabilities({ ...group, features: [billingCapabilities, crmCapabilities] })]);
    expect(grouped.describe("crm.customers.realGreen.write")).toEqual({
      featureKey: "crm",
      resourceKey: "customers",
      source: "realGreen",
      verb: "write",
      groupKey: "flagsAndWidgets",
      groupName: "Flags and widgets",
    });
  });

  it("lists one group for the admin screens, with its name and description", () => {
    const grouped = buildRegistry([combineCapabilities({ ...group, features: [custFlagCapabilities] })]);
    expect(grouped.byGroup).toEqual([
      {
        key: "flagsAndWidgets",
        name: "Flags and widgets",
        description: "Both, together.",
        capabilities: custFlagCapabilities.capabilities,
      },
    ]);
  });

  it("rejects a feature that is in a group and also registered on its own", () => {
    expect(() =>
      buildRegistry([combineCapabilities({ ...group, features: [custFlagCapabilities] }), custFlagCapabilities]),
    ).toThrow("Duplicate capability 'custFlag.custFlags.realGreen.read'");
  });

  it("keeps a nested group's origins, so its strings stay the features' own", () => {
    const inner = combineCapabilities({ key: "inner", name: "Inner", description: "", features: [custFlagCapabilities] });
    const outer = combineCapabilities({ key: "outer", name: "Outer", description: "", features: [inner, widgetCapabilities] });
    expect(buildRegistry([outer]).allCapabilities).toEqual([
      ...custFlagCapabilities.capabilities,
      ...widgetCapabilities.capabilities,
    ]);
  });
});
