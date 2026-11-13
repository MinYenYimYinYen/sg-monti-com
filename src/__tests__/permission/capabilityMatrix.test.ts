import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/permission/buildRegistry";
import { combineCapabilities } from "@/permission/combineCapabilities";
import { createFeatureCapabilities, type Capability } from "@/permission/PermissionTypes";
import { buildMatrix, cellChange, type MatrixCell } from "@/permission/logic/capabilityMatrix";
import { billing, crm, customersGroup, ledger, notes } from "./matrixFixtures";

const registry = buildRegistry([customersGroup, ledger, notes]);
const matrix = buildMatrix({ registry });

const NONE = new Set<Capability>();
const set = (...capabilities: string[]) => new Set(capabilities as Capability[]);

function cellOf({ rowKey, verb }: { rowKey: string; verb: string }): MatrixCell {
  const row = matrix.rows.find((candidate) => candidate.key === rowKey);
  const cell = row?.cells[matrix.columns.indexOf(verb)];
  if (!cell) throw new Error(`No ${verb} cell on row ${rowKey}`);
  return cell;
}

describe("buildMatrix", () => {
  it("makes one row per group in registry order", () => {
    expect(matrix.rows.map((row) => row.key)).toEqual(["customers", "ledger", "notes"]);
  });

  it("orders the columns read, write, delete", () => {
    expect(matrix.columns).toEqual(["read", "write", "delete"]);
  });

  it("puts a group's members of one verb into one cell, with their own strings", () => {
    expect(cellOf({ rowKey: "customers", verb: "read" }).capabilities).toEqual([
      "billing.customers.qbo.read",
      "crm.customers.realGreen.read",
    ]);
    expect(cellOf({ rowKey: "customers", verb: "write" }).capabilities).toEqual(["crm.customers.realGreen.write"]);
  });

  it("leaves a cell empty where the row has no such verb", () => {
    const notesRow = matrix.rows.find((row) => row.key === "notes");
    expect(notesRow?.cells[matrix.columns.indexOf("delete")]).toBeNull();
  });

  it("names a bare feature's row by its key, with its own members", () => {
    const ledgerRow = matrix.rows.find((candidate) => candidate.key === "ledger");
    expect(ledgerRow?.name).toBe("ledger");
    expect(ledgerRow?.members.map((member) => member.capability)).toEqual([
      "ledger.entries.read",
      "ledger.postings.qbo.write",
    ]);
  });

  it("carries the group name and description onto its row", () => {
    expect(matrix.rows[0].name).toBe("Customers");
    expect(matrix.rows[0].description).toBe("Customer lists from both systems.");
  });

  it("is empty for an empty registry", () => {
    expect(buildMatrix({ registry: buildRegistry([]) })).toEqual({ columns: [], rows: [] });
  });

  it("lists a feature's resources side by side in one row when it is grouped", () => {
    const grouped = buildMatrix({
      registry: buildRegistry([combineCapabilities({ key: "both", name: "Both", description: "", features: [notes, ledger] })]),
    });
    expect(grouped.rows.map((row) => row.key)).toEqual(["both"]);
    expect(grouped.rows[0].members.map((member) => member.capability)).toEqual([
      "notes.notes.read",
      "notes.notes.write",
      "ledger.entries.read",
      "ledger.postings.qbo.write",
    ]);
  });
});

describe("cellChange", () => {
  it("ticking a cell adds its members that are not held", () => {
    const change = cellChange({
      cell: cellOf({ rowKey: "customers", verb: "read" }),
      held: set("billing.customers.qbo.read"),
      turnOn: true,
      registry,
    });
    expect(change).toEqual({ add: ["crm.customers.realGreen.read"], remove: [] });
  });

  it("ticking write also adds the read it needs", () => {
    const change = cellChange({
      cell: cellOf({ rowKey: "customers", verb: "write" }),
      held: NONE,
      turnOn: true,
      registry,
    });
    expect(change.add).toEqual(["crm.customers.realGreen.write", "crm.customers.realGreen.read"]);
  });

  it("clearing read also clears the write and delete that depend on it", () => {
    const change = cellChange({
      cell: cellOf({ rowKey: "customers", verb: "read" }),
      held: set("crm.customers.realGreen.read", "crm.customers.realGreen.write", "crm.customers.realGreen.delete"),
      turnOn: false,
      registry,
    });
    expect([...change.remove].sort()).toEqual([
      "crm.customers.realGreen.delete",
      "crm.customers.realGreen.read",
      "crm.customers.realGreen.write",
    ]);
  });

  it("clearing write leaves read alone", () => {
    const change = cellChange({
      cell: cellOf({ rowKey: "customers", verb: "write" }),
      held: set("crm.customers.realGreen.read", "crm.customers.realGreen.write"),
      turnOn: false,
      registry,
    });
    expect(change.remove).toEqual(["crm.customers.realGreen.write"]);
  });

  it("changes nothing for a member already in the wanted state", () => {
    const cell = cellOf({ rowKey: "notes", verb: "read" });
    expect(cellChange({ cell, held: set("notes.notes.read"), turnOn: true, registry }).add).toEqual([]);
    expect(cellChange({ cell, held: NONE, turnOn: false, registry }).remove).toEqual([]);
  });

  it("does not expand a declared requires, only verb companions", () => {
    const needy = createFeatureCapabilities({
      key: "needy",
      resources: { things: { shape: "collection", verbs: ["read"] } },
      requires: { "things.read": [billing.can.customers.read] },
    });
    const needyRegistry = buildRegistry([needy, billing]);
    const needyMatrix = buildMatrix({ registry: needyRegistry });
    const cell = needyMatrix.rows.find((row) => row.key === "needy")?.cells[0];
    if (!cell) throw new Error("No cell");

    const change = cellChange({ cell, held: NONE, turnOn: true, registry: needyRegistry });
    expect(change.add).toEqual(["needy.things.read"]);
  });
});
