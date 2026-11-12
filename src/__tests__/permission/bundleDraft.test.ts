import { describe, expect, it } from "vitest";
import {
  draftFromBundle,
  EMPTY_BUNDLE_DRAFT,
  isDraftChanged,
  setDraftCapabilities,
  toggleDraftCapability,
} from "@/permission/logic/bundleDraft";
import { baselineBundle, flagCan, widgetCan } from "./logicFixtures";

const stored = { ...baselineBundle, name: "Baseline", description: "Everyone" };

describe("draftFromBundle", () => {
  it("copies the bundle, with a missing description as empty text", () => {
    expect(draftFromBundle(stored)).toEqual({
      bundleKey: "baseline",
      name: "Baseline",
      description: "Everyone",
      capabilities: [...baselineBundle.capabilities],
    });
    expect(draftFromBundle({ ...stored, description: undefined }).description).toBe("");
  });

  it("copies the capability list, so editing the draft never touches the stored bundle", () => {
    const draft = draftFromBundle(stored);
    expect(draft.capabilities).not.toBe(stored.capabilities);
  });
});

describe("toggleDraftCapability", () => {
  const draft = draftFromBundle(stored);

  it("adds a capability on the end, keeping the order picked", () => {
    const next = toggleDraftCapability({ draft, capability: flagCan.custFlags.read, selected: true });
    expect(next.capabilities).toEqual([...baselineBundle.capabilities, flagCan.custFlags.read]);
  });

  it("does not add a capability twice, and moves nothing else", () => {
    const next = toggleDraftCapability({ draft, capability: widgetCan.widgets.read, selected: true });
    expect(next.capabilities.filter((capability) => capability === widgetCan.widgets.read)).toHaveLength(1);
  });

  it("removes a capability", () => {
    const next = toggleDraftCapability({ draft, capability: widgetCan.widgets.read, selected: false });
    expect(next.capabilities).toEqual([widgetCan.preferences.read]);
  });

  it("returns a new draft and leaves the input alone", () => {
    toggleDraftCapability({ draft, capability: flagCan.custFlags.read, selected: true });
    expect(draft.capabilities).toEqual([...baselineBundle.capabilities]);
  });
});

describe("setDraftCapabilities", () => {
  const draft = draftFromBundle(stored);
  const feature = [widgetCan.widgets.read, widgetCan.widgets.write, widgetCan.widgets.delete];

  it("adds only the ones the draft lacks, after the existing ones", () => {
    const next = setDraftCapabilities({ draft, capabilities: feature, selected: true });
    expect(next.capabilities).toEqual([
      widgetCan.widgets.read,
      widgetCan.preferences.read,
      widgetCan.widgets.write,
      widgetCan.widgets.delete,
    ]);
  });

  it("removes every listed capability and keeps the rest", () => {
    const next = setDraftCapabilities({ draft, capabilities: feature, selected: false });
    expect(next.capabilities).toEqual([widgetCan.preferences.read]);
  });

  it("does nothing for an empty list", () => {
    expect(setDraftCapabilities({ draft, capabilities: [], selected: true }).capabilities).toEqual(draft.capabilities);
  });
});

describe("isDraftChanged", () => {
  it("is false for an untouched draft of a stored bundle", () => {
    expect(isDraftChanged({ draft: draftFromBundle(stored), stored })).toBe(false);
  });

  it("notices a changed name, description or capability list, and a different order", () => {
    const draft = draftFromBundle(stored);
    expect(isDraftChanged({ draft: { ...draft, name: "Other" }, stored })).toBe(true);
    expect(isDraftChanged({ draft: { ...draft, description: "" }, stored })).toBe(true);
    expect(
      isDraftChanged({ draft: { ...draft, capabilities: [...draft.capabilities].reverse() }, stored }),
    ).toBe(true);
    expect(isDraftChanged({ draft: { ...draft, capabilities: [] }, stored })).toBe(true);
  });

  it("treats a missing stored description like empty text", () => {
    const bare = { ...stored, description: undefined };
    expect(isDraftChanged({ draft: draftFromBundle(bare), stored: bare })).toBe(false);
  });

  it("calls a blank new bundle unchanged and a started one changed", () => {
    expect(isDraftChanged({ draft: EMPTY_BUNDLE_DRAFT, stored: undefined })).toBe(false);
    expect(isDraftChanged({ draft: { ...EMPTY_BUNDLE_DRAFT, bundleKey: "tech" }, stored: undefined })).toBe(true);
    expect(isDraftChanged({ draft: { ...EMPTY_BUNDLE_DRAFT, capabilities: [widgetCan.widgets.read] }, stored: undefined })).toBe(
      true,
    );
  });
});
