import { describe, expect, it } from "vitest";
import { planDirectAdd } from "@/permission/logic/requirementLogic";
import { addDirectMany } from "@/permission/logic/userCapabilityLogic";
import { EMPTY_BUNDLE_DRAFT, selectWithRequirements } from "@/permission/logic/bundleDraft";
import {
  allBundles,
  flagCan,
  makeUserGrants,
  registry,
  registryWithReports,
  reportCan,
  widgetCan,
} from "./logicFixtures";

describe("planDirectAdd", () => {
  const superUser = { actorIsSuperUser: true, actorCapabilities: [] };

  it("is just the capability when it needs nothing", () => {
    expect(planDirectAdd({ capability: widgetCan.widgets.read, effective: [], ...superUser, registry })).toEqual({
      capabilities: [widgetCan.widgets.read],
      unassignable: [],
    });
  });

  it("puts the picked capability first, then what it needs", () => {
    expect(
      planDirectAdd({ capability: reportCan.reports.read, effective: [], ...superUser, registry: registryWithReports }),
    ).toEqual({
      capabilities: [reportCan.reports.read, widgetCan.widgets.read, flagCan.custFlags.read],
      unassignable: [],
    });
  });

  it("skips a requirement the user already holds, which addDirect would refuse", () => {
    expect(
      planDirectAdd({
        capability: reportCan.reports.read,
        effective: [widgetCan.widgets.read],
        ...superUser,
        registry: registryWithReports,
      }).capabilities,
    ).toEqual([reportCan.reports.read, flagCan.custFlags.read]);
  });

  it("reports, and does not offer, a requirement a non-superuser does not hold", () => {
    expect(
      planDirectAdd({
        capability: reportCan.reports.read,
        effective: [],
        actorIsSuperUser: false,
        actorCapabilities: [widgetCan.widgets.read],
        registry: registryWithReports,
      }),
    ).toEqual({
      capabilities: [reportCan.reports.read, widgetCan.widgets.read],
      unassignable: [flagCan.custFlags.read],
    });
  });
});

describe("addDirectMany", () => {
  it("adds every capability in one result", () => {
    expect(
      addDirectMany({
        user: makeUserGrants(),
        capabilities: [widgetCan.widgets.write, widgetCan.widgets.read],
        bundles: allBundles,
        registry,
      }),
    ).toEqual({ ok: true, capabilities: [widgetCan.widgets.write, widgetCan.widgets.read] });
  });

  it("refuses the whole list on the first refusal and names the capability, leaving the user untouched", () => {
    const user = makeUserGrants({ bundleKeys: ["baseline"] });
    const result = addDirectMany({
      user,
      capabilities: [widgetCan.widgets.write, widgetCan.widgets.read],
      bundles: allBundles,
      registry,
    });
    expect(result).toEqual({ ok: false, reason: "coveredByBundle", capability: widgetCan.widgets.read });
    expect(user.capabilities).toEqual([]);
  });

  it("refuses a string the registry does not know", () => {
    expect(addDirectMany({ user: makeUserGrants(), capabilities: ["made.up.read"], bundles: [], registry })).toEqual({
      ok: false,
      reason: "unknownCapability",
      capability: "made.up.read",
    });
  });

  it("treats a repeated capability as one", () => {
    expect(
      addDirectMany({
        user: makeUserGrants(),
        capabilities: [widgetCan.widgets.read, widgetCan.widgets.read],
        bundles: [],
        registry,
      }),
    ).toEqual({ ok: true, capabilities: [widgetCan.widgets.read] });
  });
});

describe("selectWithRequirements (bundle editor)", () => {
  it("ticks a capability and what it needs, after the ones already chosen", () => {
    const draft = { ...EMPTY_BUNDLE_DRAFT, capabilities: [widgetCan.widgets.delete] };
    const next = selectWithRequirements({ draft, capabilities: [reportCan.reports.read], registry: registryWithReports });
    expect(next.capabilities).toEqual([
      widgetCan.widgets.delete,
      reportCan.reports.read,
      widgetCan.widgets.read,
      flagCan.custFlags.read,
    ]);
  });

  it("does not add a requirement twice", () => {
    const draft = { ...EMPTY_BUNDLE_DRAFT, capabilities: [widgetCan.widgets.read] };
    const next = selectWithRequirements({ draft, capabilities: [reportCan.reports.read], registry: registryWithReports });
    expect(next.capabilities.filter((capability) => capability === widgetCan.widgets.read)).toHaveLength(1);
  });

  it("does not bring requirements back for a capability that was already ticked", () => {
    // The admin unticked the flags read on purpose; ticking the feature's All must not re-add it.
    const draft = { ...EMPTY_BUNDLE_DRAFT, capabilities: [reportCan.reports.read, widgetCan.widgets.read] };
    const next = selectWithRequirements({ draft, capabilities: [reportCan.reports.read], registry: registryWithReports });
    expect(next.capabilities).toEqual([reportCan.reports.read, widgetCan.widgets.read]);
  });

  it("returns a new draft and leaves the input alone", () => {
    const draft = { ...EMPTY_BUNDLE_DRAFT };
    selectWithRequirements({ draft, capabilities: [reportCan.reports.read], registry: registryWithReports });
    expect(draft.capabilities).toEqual([]);
  });
});
