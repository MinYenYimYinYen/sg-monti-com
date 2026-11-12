import { describe, expect, it } from "vitest";
import { canAssign, canManageCapabilitiesOf, findMissingCompanions } from "@/permission/logic/assignmentGuards";
import { baselineBundle, flagCan, officeBundle, registry, widgetCan } from "./logicFixtures";

describe("canAssign", () => {
  it("lets a superuser assign anything, holding nothing", () => {
    expect(canAssign({ actorIsSuperUser: true, actorCapabilities: [], granting: officeBundle.capabilities })).toEqual({
      allowed: true,
    });
  });

  it("lets anyone assign capabilities they hold themselves", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: [...baselineBundle.capabilities, flagCan.custFlags.read],
        granting: baselineBundle.capabilities,
      }),
    ).toEqual({ allowed: true });
  });

  it("refuses a grant that includes something the actor lacks, and names it", () => {
    expect(
      canAssign({
        actorIsSuperUser: false,
        actorCapabilities: [widgetCan.widgets.read],
        granting: officeBundle.capabilities,
      }),
    ).toEqual({ allowed: false, missing: [widgetCan.widgets.write, flagCan.custFlags.write] });
  });

  it("refuses everything for an actor holding nothing (an applied user)", () => {
    expect(
      canAssign({ actorIsSuperUser: false, actorCapabilities: [], granting: [widgetCan.widgets.read] }),
    ).toMatchObject({ allowed: false });
  });

  it("allows granting nothing", () => {
    expect(canAssign({ actorIsSuperUser: false, actorCapabilities: [], granting: [] })).toEqual({ allowed: true });
  });
});

describe("canManageCapabilitiesOf", () => {
  it("lets anyone manage an ordinary account", () => {
    expect(canManageCapabilitiesOf({ target: {}, actorIsSuperUser: false })).toBe(true);
  });

  it("lets only a superuser manage a kiosk", () => {
    expect(canManageCapabilitiesOf({ target: { isKiosk: true }, actorIsSuperUser: false })).toBe(false);
    expect(canManageCapabilitiesOf({ target: { isKiosk: true }, actorIsSuperUser: true })).toBe(true);
  });

  it("lets only a superuser manage a superuser", () => {
    expect(canManageCapabilitiesOf({ target: { isSuperUser: true }, actorIsSuperUser: false })).toBe(false);
    expect(canManageCapabilitiesOf({ target: { isSuperUser: true }, actorIsSuperUser: true })).toBe(true);
  });

  it("treats explicit false flags like absent ones", () => {
    expect(canManageCapabilitiesOf({ target: { isSuperUser: false, isKiosk: false }, actorIsSuperUser: false })).toBe(
      true,
    );
  });
});

describe("findMissingCompanions (warn only)", () => {
  it("reports a write without its read", () => {
    expect(findMissingCompanions({ capabilities: [widgetCan.widgets.write], registry })).toEqual([
      { capability: widgetCan.widgets.write, missing: widgetCan.widgets.read },
    ]);
  });

  it("is quiet when the read is held", () => {
    expect(findMissingCompanions({ capabilities: [widgetCan.widgets.write, widgetCan.widgets.read], registry })).toEqual(
      [],
    );
  });

  it("reports delete without read", () => {
    expect(findMissingCompanions({ capabilities: [widgetCan.widgets.delete], registry })).toEqual([
      { capability: widgetCan.widgets.delete, missing: widgetCan.widgets.read },
    ]);
  });

  it("reports readAny without read", () => {
    expect(findMissingCompanions({ capabilities: [widgetCan.preferences.readAny], registry })).toEqual([
      { capability: widgetCan.preferences.readAny, missing: widgetCan.preferences.read },
    ]);
  });

  it("does not report a companion the feature never declared", () => {
    // custFlags declares read and write only, so a write is checked against read; widgets.write is too.
    // preferences declares no writeAny, so nothing is expected for it.
    expect(findMissingCompanions({ capabilities: [widgetCan.preferences.readAny, widgetCan.preferences.read], registry })).toEqual(
      [],
    );
  });

  it("reports the external-source case with its source segment", () => {
    expect(findMissingCompanions({ capabilities: [flagCan.custFlags.write], registry })).toEqual([
      { capability: flagCan.custFlags.write, missing: flagCan.custFlags.read },
    ]);
  });

  it("ignores strings the registry does not know, and read-only lists", () => {
    expect(findMissingCompanions({ capabilities: ["old.thing.write" as never, widgetCan.widgets.read], registry })).toEqual(
      [],
    );
  });
});
