import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/permission/buildRegistry";
import { expandRequirements, findMissingRequirements } from "@/permission/logic/requirementLogic";
import { custFlagCapabilities, reportCapabilities, widgetCapabilities } from "./permissionFixtures";
import { flagCan, registry, registryWithReports, reportCan, widgetCan } from "./logicFixtures";

describe("requirementsOf: verb companions (replaces the old warn-only companion map)", () => {
  it("a write needs its read", () => {
    expect(registry.requirementsOf(widgetCan.widgets.write)).toEqual([widgetCan.widgets.read]);
  });

  it("a delete needs its read", () => {
    expect(registry.requirementsOf(widgetCan.widgets.delete)).toEqual([widgetCan.widgets.read]);
  });

  it("readAny needs read", () => {
    expect(registry.requirementsOf(widgetCan.preferences.readAny)).toEqual([widgetCan.preferences.read]);
  });

  it("keeps the source segment for external data", () => {
    expect(registry.requirementsOf(flagCan.custFlags.write)).toEqual([flagCan.custFlags.read]);
  });

  it("a read needs nothing, and an unknown string needs nothing", () => {
    expect(registry.requirementsOf(widgetCan.widgets.read)).toEqual([]);
    expect(registry.requirementsOf("old.thing.write")).toEqual([]);
  });
});

describe("requirementsOf: declared requires", () => {
  it("lists what the declaration names, and a write still needs its own read", () => {
    expect(registryWithReports.requirementsOf(reportCan.reports.read)).toEqual([
      widgetCan.widgets.read,
      flagCan.custFlags.read,
    ]);
    expect(registryWithReports.requirementsOf(reportCan.reports.write)).toEqual([reportCan.reports.read]);
  });

  it("accepts a requirement on a feature registered after the one that names it", () => {
    const reportsFirst = buildRegistry([reportCapabilities, custFlagCapabilities, widgetCapabilities]);
    expect(reportsFirst.requirementsOf(reportCan.reports.read)).toEqual([
      widgetCan.widgets.read,
      flagCan.custFlags.read,
    ]);
  });

  it("throws when a requirement names a capability the registry lacks", () => {
    const declaration = {
      key: "broken",
      resources: { things: { shape: "collection", verbs: ["read"] } },
      requires: { "things.read": ["nothing.here.read"] },
    };
    expect(() => buildRegistry([{ declaration } as never])).toThrow(
      "requires 'nothing.here.read', which is not in the capability registry",
    );
  });

  it("throws when a capability requires itself", () => {
    const declaration = {
      key: "loop",
      resources: { things: { shape: "collection", verbs: ["read"] } },
      requires: { "things.read": ["loop.things.read"] },
    };
    expect(() => buildRegistry([{ declaration } as never])).toThrow("requires itself");
  });
});

describe("expandRequirements", () => {
  it("follows a chain to the end", () => {
    expect(expandRequirements({ capabilities: [reportCan.exports.read], registry: registryWithReports })).toEqual([
      reportCan.reports.read,
      widgetCan.widgets.read,
      flagCan.custFlags.read,
    ]);
  });

  it("leaves out what is already in the list", () => {
    expect(
      expandRequirements({
        capabilities: [reportCan.reports.read, widgetCan.widgets.read],
        registry: registryWithReports,
      }),
    ).toEqual([flagCan.custFlags.read]);
  });

  it("returns nothing for a capability that needs nothing", () => {
    expect(expandRequirements({ capabilities: [widgetCan.widgets.read], registry })).toEqual([]);
  });

  it("cannot loop on a cycle in the declarations", () => {
    const cyclic = {
      has: () => true,
      requirementsOf: (capability: string) => (capability === "a.b.read" ? ["a.c.read"] : ["a.b.read"]),
    };
    expect(expandRequirements({ capabilities: ["a.b.read"], registry: cyclic as never })).toEqual(["a.c.read"]);
  });
});

describe("findMissingRequirements (warn only)", () => {
  it("reports a write without its read", () => {
    expect(findMissingRequirements({ capabilities: [widgetCan.widgets.write], registry })).toEqual([
      { capability: widgetCan.widgets.write, missing: widgetCan.widgets.read },
    ]);
  });

  it("is quiet when the read is held", () => {
    expect(
      findMissingRequirements({ capabilities: [widgetCan.widgets.write, widgetCan.widgets.read], registry }),
    ).toEqual([]);
  });

  it("reports a declared requirement that is missing", () => {
    expect(findMissingRequirements({ capabilities: [reportCan.reports.read], registry: registryWithReports })).toEqual([
      { capability: reportCan.reports.read, missing: widgetCan.widgets.read },
      { capability: reportCan.reports.read, missing: flagCan.custFlags.read },
    ]);
  });

  it("counts a requirement held some other way, because it reads the flat effective list", () => {
    expect(
      findMissingRequirements({
        capabilities: [reportCan.reports.read, widgetCan.widgets.read, flagCan.custFlags.read],
        registry: registryWithReports,
      }),
    ).toEqual([]);
  });

  it("reports one level only, so each gap is named once", () => {
    expect(findMissingRequirements({ capabilities: [reportCan.exports.read], registry: registryWithReports })).toEqual([
      { capability: reportCan.exports.read, missing: reportCan.reports.read },
    ]);
  });

  it("ignores strings the registry does not know, and read-only lists", () => {
    expect(findMissingRequirements({ capabilities: ["old.thing.write" as never], registry })).toEqual([]);
    expect(findMissingRequirements({ capabilities: [widgetCan.widgets.read], registry })).toEqual([]);
  });
});
