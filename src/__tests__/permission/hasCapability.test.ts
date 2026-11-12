import { describe, expect, it } from "vitest";
import {
  appliedUser,
  check,
  custFlagCapabilities,
  makeTokenPayload,
  officeCapabilities,
  officeUser,
  publicWidgetCapabilities,
  superUserTokenHint,
  widgetCapabilities,
  widgetEditor,
  widgetEditorCapabilities,
} from "./permissionFixtures";

const { can: widgetCan } = widgetCapabilities;
const { can: flagCan } = custFlagCapabilities;

describe("hasCapability: public ops", () => {
  it("passes with no identity", () => {
    expect(check({ required: "public", identity: null })).toBe(true);
  });

  it("passes for an applied user", () => {
    expect(check({ required: "public", identity: appliedUser })).toBe(true);
  });

  it("passes for a user holding unrelated capabilities", () => {
    expect(check({ required: "public", identity: officeUser, capabilities: officeCapabilities })).toBe(true);
  });

  it("is what a declared public verb resolves to", () => {
    expect(check({ required: publicWidgetCapabilities.can.widgets.read, identity: null })).toBe(true);
    expect(check({ required: publicWidgetCapabilities.can.widgets.write, identity: null })).toBe(false);
  });
});

describe("hasCapability: identity", () => {
  it("fails a non-public op when not logged in", () => {
    expect(check({ required: widgetCan.widgets.read, identity: null, capabilities: officeCapabilities })).toBe(false);
  });

  it("checks identity before the superuser bypass", () => {
    expect(check({ required: widgetCan.widgets.read, identity: null, isSuperUserConfirmed: true })).toBe(false);
  });
});

describe("hasCapability: superuser", () => {
  it("passes a confirmed superuser with no capabilities", () => {
    expect(
      check({ required: widgetCan.widgets.delete, identity: superUserTokenHint, isSuperUserConfirmed: true }),
    ).toBe(true);
  });

  it("denies a token superuser hint the database did not confirm", () => {
    expect(
      check({ required: widgetCan.widgets.delete, identity: superUserTokenHint, isSuperUserConfirmed: false }),
    ).toBe(false);
  });

  it("trusts the confirmation, not the token claim (flag added in Compass, token not refreshed)", () => {
    const staleToken = makeTokenPayload({ userName: "superLuke", isSuperUser: false });
    expect(check({ required: widgetCan.widgets.delete, identity: staleToken, isSuperUserConfirmed: true })).toBe(true);
  });

  it("does not let a hint grant a capability the user holds a hint for only", () => {
    expect(
      check({
        required: flagCan.custFlags.write,
        identity: superUserTokenHint,
        capabilities: officeCapabilities,
      }),
    ).toBe(false);
  });
});

describe("hasCapability: capability lookup", () => {
  it("passes a user holding the exact capability", () => {
    expect(check({ required: widgetCan.widgets.write, identity: widgetEditor, capabilities: widgetEditorCapabilities })).toBe(
      true,
    );
  });

  it("fails a user holding a different capability on the same resource", () => {
    expect(check({ required: widgetCan.widgets.write, identity: officeUser, capabilities: officeCapabilities })).toBe(false);
  });

  it("fails a user holding the same verb on another resource", () => {
    expect(check({ required: widgetCan.preferences.write, identity: widgetEditor, capabilities: widgetEditorCapabilities })).toBe(
      false,
    );
  });

  it("does not treat readAny as read, or read as readAny", () => {
    expect(check({ required: widgetCan.preferences.read, capabilities: [widgetCan.preferences.readAny] })).toBe(false);
    expect(check({ required: widgetCan.preferences.readAny, capabilities: [widgetCan.preferences.read] })).toBe(false);
  });

  it("does not imply read from write (implication is an assignment-time rule)", () => {
    expect(check({ required: widgetCan.widgets.read, capabilities: [widgetCan.widgets.write] })).toBe(false);
  });

  it("matches the external source segment exactly", () => {
    expect(check({ required: flagCan.custFlags.read, capabilities: ["custFlag.custFlags.read"] })).toBe(false);
    expect(check({ required: flagCan.custFlags.read, capabilities: ["custFlag.custFlags.qbo.read"] })).toBe(false);
    expect(check({ required: flagCan.custFlags.read, capabilities: ["custFlag.custFlags.realGreen.read"] })).toBe(true);
  });

  it("does no prefix or wildcard matching", () => {
    expect(check({ required: widgetCan.widgets.read, capabilities: ["widgetManagement.widgets" as `${string}.${string}.${string}`] })).toBe(false);
    expect(check({ required: widgetCan.widgets.read, capabilities: ["widgetManagement.widgets.*"] })).toBe(false);
    expect(check({ required: widgetCan.widgets.read, capabilities: ["widgetManagement.*.*"] })).toBe(false);
  });
});

describe("hasCapability: applied and kiosk-style users", () => {
  it("applied user passes only public ops", () => {
    expect(check({ required: "public", identity: appliedUser })).toBe(true);
    expect(check({ required: widgetCan.widgets.read, identity: appliedUser })).toBe(false);
    expect(check({ required: flagCan.custFlags.read, identity: appliedUser })).toBe(false);
  });

  it("a user with a small capability list is denied everything else", () => {
    const kiosk = makeTokenPayload({ userName: "kiosk1", saId: "SA-KIOSK" });
    const capabilities = [flagCan.custFlags.read];
    expect(check({ required: flagCan.custFlags.read, identity: kiosk, capabilities })).toBe(true);
    expect(check({ required: flagCan.custFlags.write, identity: kiosk, capabilities })).toBe(false);
    expect(check({ required: widgetCan.widgets.read, identity: kiosk, capabilities })).toBe(false);
  });
});
