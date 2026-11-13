import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/permission/buildRegistry";
import type { Capability } from "@/permission/PermissionTypes";
import { applyCellChange, EMPTY_BUNDLE_DRAFT } from "@/permission/logic/bundleDraft";
import { buildMatrix, cellKey, summarizeMembers } from "@/permission/logic/capabilityMatrix";
import { customersGroup, ledger, notes } from "./matrixFixtures";

const matrix = buildMatrix({ registry: buildRegistry([customersGroup, ledger, notes]) });

const caps = (...capabilities: string[]) => capabilities as Capability[];

describe("applyCellChange", () => {
  const draft = { ...EMPTY_BUNDLE_DRAFT, capabilities: caps("a.b.read", "a.b.write", "c.d.read") };

  it("removes what the change clears and adds what it grants, keeping order", () => {
    const next = applyCellChange({
      draft,
      change: { add: caps("e.f.read"), remove: caps("a.b.write") },
    });
    expect(next.capabilities).toEqual(["a.b.read", "c.d.read", "e.f.read"]);
  });

  it("does not add a capability twice", () => {
    const next = applyCellChange({ draft, change: { add: caps("a.b.read", "z.z.read"), remove: [] } });
    expect(next.capabilities).toEqual(["a.b.read", "a.b.write", "c.d.read", "z.z.read"]);
  });

  it("returns a new draft and leaves the old one alone", () => {
    const next = applyCellChange({ draft, change: { add: [], remove: caps("a.b.read") } });
    expect(next).not.toBe(draft);
    expect(draft.capabilities).toHaveLength(3);
  });
});

describe("summarizeMembers", () => {
  it("lists each feature's resource once, with its verbs", () => {
    const row = matrix.rows.find((candidate) => candidate.key === "customers");
    if (!row) throw new Error("No customers row");
    expect(summarizeMembers({ row })).toEqual([
      { featureKey: "billing", resource: "customers (qbo)", verbs: ["read"] },
      { featureKey: "crm", resource: "customers (realGreen)", verbs: ["read", "write", "delete"] },
    ]);
  });
});

describe("cellKey", () => {
  it("joins the row and verb, so two rows with the same verb stay apart", () => {
    expect(cellKey({ rowKey: "customers", verb: "read" })).not.toBe(cellKey({ rowKey: "notes", verb: "read" }));
  });
});
