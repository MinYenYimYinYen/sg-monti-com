import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/permission/buildRegistry";
import type { Capability } from "@/permission/PermissionTypes";
import { buildMatrix, cellState, planUserCell, type MatrixCell } from "@/permission/logic/capabilityMatrix";
import { customersGroup, ledger, notes } from "./matrixFixtures";

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

describe("cellState", () => {
  const cell = () => cellOf({ rowKey: "customers", verb: "read" });

  it("is none, some or all by how many members are held", () => {
    expect(cellState({ cell: cell(), held: NONE })).toBe("none");
    expect(cellState({ cell: cell(), held: set("billing.customers.qbo.read") })).toBe("some");
    expect(
      cellState({ cell: cell(), held: set("billing.customers.qbo.read", "crm.customers.realGreen.read") }),
    ).toBe("all");
  });
});

describe("planUserCell", () => {
  const cell = () => cellOf({ rowKey: "customers", verb: "read" });
  const superUser = { actorIsSuperUser: true, actorCapabilities: [] as Capability[] };

  it("a click on an empty cell adds every member", () => {
    const plan = planUserCell({ cell: cell(), effective: NONE, viaBundle: NONE, ...superUser, registry });
    expect(plan.state).toBe("none");
    expect(plan.change.add).toEqual(["billing.customers.qbo.read", "crm.customers.realGreen.read"]);
    expect(plan.enabled).toBe(true);
  });

  it("a click on a partly held cell completes it", () => {
    const plan = planUserCell({
      cell: cell(),
      effective: set("billing.customers.qbo.read"),
      viaBundle: NONE,
      ...superUser,
      registry,
    });
    expect(plan.state).toBe("some");
    expect(plan.change).toEqual({ add: ["crm.customers.realGreen.read"], remove: [] });
  });

  it("a click on a full cell removes the direct members", () => {
    const held = set("billing.customers.qbo.read", "crm.customers.realGreen.read");
    const plan = planUserCell({ cell: cell(), effective: held, viaBundle: NONE, ...superUser, registry });
    expect(plan.state).toBe("all");
    expect(plan.change.remove).toEqual(["billing.customers.qbo.read", "crm.customers.realGreen.read"]);
  });

  it("does not try to remove a member a bundle lists, and reports it as locked", () => {
    const held = set("billing.customers.qbo.read", "crm.customers.realGreen.read");
    const plan = planUserCell({
      cell: cell(),
      effective: held,
      viaBundle: set("billing.customers.qbo.read"),
      ...superUser,
      registry,
    });
    expect(plan.lockedByBundle).toEqual(["billing.customers.qbo.read"]);
    expect(plan.change.remove).toEqual(["crm.customers.realGreen.read"]);
  });

  it("is disabled when a bundle holds the whole cell, since nothing can change", () => {
    const held = set("billing.customers.qbo.read", "crm.customers.realGreen.read");
    const plan = planUserCell({ cell: cell(), effective: held, viaBundle: held, ...superUser, registry });
    expect(plan.enabled).toBe(false);
  });

  it("blocks a click that would hand out what the actor does not hold", () => {
    const plan = planUserCell({
      cell: cell(),
      effective: NONE,
      viaBundle: NONE,
      actorIsSuperUser: false,
      actorCapabilities: ["billing.customers.qbo.read"],
      registry,
    });
    expect(plan.blockedForActor).toEqual(["crm.customers.realGreen.read"]);
    expect(plan.enabled).toBe(false);
  });
});
