import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/permission/buildRegistry";
import type { Capability } from "@/permission/PermissionTypes";
import { buildMatrix, isRowUsed, matchesRowFilter } from "@/permission/logic/capabilityMatrix";
import { customersGroup, ledger, notes } from "./matrixFixtures";

const matrix = buildMatrix({ registry: buildRegistry([customersGroup, ledger, notes]) });

const NONE = new Set<Capability>();
const set = (...capabilities: string[]) => new Set(capabilities as Capability[]);

function rowOf(key: string) {
  const row = matrix.rows.find((candidate) => candidate.key === key);
  if (!row) throw new Error(`No row ${key}`);
  return row;
}

describe("matchesRowFilter", () => {
  const customers = () => rowOf("customers");
  const held = set("crm.customers.realGreen.read");

  it("an empty filter shows every row", () => {
    expect(matchesRowFilter({ row: customers(), text: "", usage: "all", held: NONE })).toBe(true);
  });

  it("matches the name, case-insensitively", () => {
    expect(matchesRowFilter({ row: customers(), text: "CUSTOM", usage: "all", held: NONE })).toBe(true);
    expect(matchesRowFilter({ row: customers(), text: "zebra", usage: "all", held: NONE })).toBe(false);
  });

  it("matches the description and a member's feature or resource key", () => {
    expect(matchesRowFilter({ row: customers(), text: "both systems", usage: "all", held: NONE })).toBe(true);
    expect(matchesRowFilter({ row: customers(), text: "billing", usage: "all", held: NONE })).toBe(true);
  });

  it("used shows a row with any capability held, including a partial one", () => {
    expect(isRowUsed({ row: customers(), held })).toBe(true);
    expect(matchesRowFilter({ row: customers(), text: "", usage: "used", held })).toBe(true);
    expect(matchesRowFilter({ row: customers(), text: "", usage: "unused", held })).toBe(false);
  });

  it("unused shows a row with nothing held", () => {
    expect(matchesRowFilter({ row: rowOf("notes"), text: "", usage: "unused", held })).toBe(true);
    expect(matchesRowFilter({ row: rowOf("notes"), text: "", usage: "used", held })).toBe(false);
  });

  it("applies the text and the toggle together", () => {
    expect(matchesRowFilter({ row: customers(), text: "billing", usage: "unused", held })).toBe(false);
    expect(matchesRowFilter({ row: customers(), text: "billing", usage: "used", held })).toBe(true);
  });
});
