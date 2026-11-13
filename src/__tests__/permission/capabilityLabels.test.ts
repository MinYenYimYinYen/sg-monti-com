import { describe, expect, it } from "vitest";
import { capabilityLabel, groupCapabilitiesByGroup } from "@/permission/logic/capabilityLabels";
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

describe("groupCapabilitiesByGroup", () => {
  it("groups by group, groups alphabetical by name, capabilities in the order given", () => {
    const { groups, unknown } = groupCapabilitiesByGroup({
      capabilities: [widgetCan.widgets.write, flagCan.custFlags.read, widgetCan.widgets.read],
      registry,
    });
    expect(groups).toEqual([
      { groupKey: "custFlag", groupName: "custFlag", capabilities: [flagCan.custFlags.read] },
      {
        groupKey: "widgetManagement",
        groupName: "widgetManagement",
        capabilities: [widgetCan.widgets.write, widgetCan.widgets.read],
      },
    ]);
    expect(unknown).toEqual([]);
  });

  it("returns unknown strings separately instead of dropping them", () => {
    const { groups, unknown } = groupCapabilitiesByGroup({
      capabilities: [flagCan.custFlags.read, "old.thing.read" as never],
      registry,
    });
    expect(groups).toHaveLength(1);
    expect(unknown).toEqual(["old.thing.read"]);
  });

  it("is empty for no capabilities", () => {
    expect(groupCapabilitiesByGroup({ capabilities: [], registry })).toEqual({ groups: [], unknown: [] });
  });

  it("can group the whole registry", () => {
    const { groups, unknown } = groupCapabilitiesByGroup({ capabilities: registry.allCapabilities, registry });
    expect(groups.map((group) => group.groupKey)).toEqual(["custFlag", "widgetManagement"]);
    expect(unknown).toEqual([]);
  });
});
