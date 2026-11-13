import { describe, expect, it } from "vitest";
import { canAssign, canManageCapabilitiesOf } from "@/permission/logic/assignmentGuards";
import { baselineBundle, flagCan, officeBundle, widgetCan } from "./logicFixtures";

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


