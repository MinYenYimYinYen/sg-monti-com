import { describe, expect, it } from "vitest";
import { capabilityLabel, groupCapabilitiesByFeature } from "@/permission/logic/capabilityLabels";
import { flagCan, registry, widgetCan } from "./logicFixtures";

describe("capabilityLabel", () => {
  it("shows resource and verb for native data", () => {
    expect(capabilityLabel({ capability: widgetCan.widgets.write, registry })).toBe("widgets · write");
  });

  it("includes the source for external data", () => {
    expect(capabilityLabel({ capability: flagCan.custFlags.read, registry })).toBe("custFlags (realGreen) · read");
  });

  it("shows a string the registry no longer knows exactly as stored", () => {
    expect(capabilityLabel({ capability: "old.thing.read", registry })).toBe("old.thing.read");
  });
});

describe("groupCapabilitiesByFeature", () => {
  it("groups by feature, features alphabetical, capabilities in the order given", () => {
    const { features, unknown } = groupCapabilitiesByFeature({
      capabilities: [widgetCan.widgets.write, flagCan.custFlags.read, widgetCan.widgets.read],
      registry,
    });
    expect(features).toEqual([
      { featureKey: "custFlag", capabilities: [flagCan.custFlags.read] },
      { featureKey: "widgetManagement", capabilities: [widgetCan.widgets.write, widgetCan.widgets.read] },
    ]);
    expect(unknown).toEqual([]);
  });

  it("returns unknown strings separately instead of dropping them", () => {
    const { features, unknown } = groupCapabilitiesByFeature({
      capabilities: [flagCan.custFlags.read, "old.thing.read" as never],
      registry,
    });
    expect(features).toHaveLength(1);
    expect(unknown).toEqual(["old.thing.read"]);
  });

  it("is empty for no capabilities", () => {
    expect(groupCapabilitiesByFeature({ capabilities: [], registry })).toEqual({ features: [], unknown: [] });
  });

  it("can group the whole registry", () => {
    const { features, unknown } = groupCapabilitiesByFeature({ capabilities: registry.allCapabilities, registry });
    expect(features.map((feature) => feature.featureKey)).toEqual(["custFlag", "widgetManagement"]);
    expect(unknown).toEqual([]);
  });
});
